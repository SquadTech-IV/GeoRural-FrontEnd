import api from './api'

const BASE = '/api/monitoramento'
export const LIMITE_RESPOSTA_PADRAO = 3

export function prepararResumoMonitoramento({ rotas = [], erros = [], recursos = [], limiteSegundos = LIMITE_RESPOSTA_PADRAO, busca = '' } = {}) {
  const rotasOrdenadas = rotas.map(rota => ({
    ...rota,
    acimaDoLimite: (rota.max ?? 0) > limiteSegundos,
    fatorLimite: limiteSegundos > 0 ? (rota.max ?? 0) / limiteSegundos : 0,
    possuiErros: (rota.err ?? 0) > 0,
  })).sort((a, b) => (b.max ?? 0) - (a.max ?? 0))

  const contagens = new Map()
  for (const erro of erros) {
    if (erro.msg) contagens.set(erro.msg, (contagens.get(erro.msg) ?? 0) + 1)
  }
  const termo = String(busca).trim().toLowerCase()
  const errosFiltrados = erros.filter(erro => !termo ||
    `${erro.msg ?? ''} ${erro.rota ?? ''} ${erro.status ?? ''} ${erro.origem ?? ''}`.toLowerCase().includes(termo),
  ).map(erro => ({
    ...erro,
    repeticoes: contagens.get(erro.msg) ?? 0,
    erroServidor: erro.status >= 500,
  }))

  return {
    rotasOrdenadas,
    qtdRotasLentas: rotasOrdenadas.filter(rota => rota.acimaDoLimite).length,
    errosFiltrados,
    recursos: recursos.map(recurso => {
      const exibirBarra = Number.isFinite(recurso.v) && Number.isFinite(recurso.max) && recurso.max > 0
      const percentual = exibirBarra ? Math.min(100, Math.max(0, recurso.v / recurso.max * 100)) : 0
      return {
        ...recurso,
        exibirBarra,
        percentual,
        nivel: percentual > 85 ? 'critico' : percentual > 65 ? 'atencao' : 'normal',
      }
    }),
  }
}

function lista(dados, campo) {
  if (!Array.isArray(dados?.[campo])) throw new Error('Resposta de monitoramento inválida.')
  return dados[campo]
}

export function mensagemErroMonitoramento(erro) {
  if (erro?.response?.status === 401 || erro?.response?.status === 403) {
    return 'Acesso ao monitoramento não autorizado. Confira a configuração de acesso do servidor.'
  }
  if (erro?.response?.status === 404) return 'O backend não disponibiliza o monitoramento da plataforma.'
  if (erro?.code === 'ECONNABORTED') return 'A consulta de monitoramento demorou demais. Tente novamente.'
  if (erro?.isAxiosError && !erro.response) return 'Não foi possível conectar ao backend.'
  return erro?.response?.data?.mensagem || erro?.message || 'Não foi possível consultar o monitoramento.'
}

export const monitoramentoService = {
  async consultar({ minutos = 60, signal } = {}) {
    const respostas = await Promise.allSettled([
      this.saude({ signal }),
      this.recursos({ signal }),
      this.desempenho({ signal }),
      this.erros({ minutos, signal }),
    ])
    if (signal?.aborted) throw Object.assign(new Error('Consulta cancelada.'), { code: 'ERR_CANCELED' })
    const nomes = ['Estado dos componentes', 'Consumo de recursos', 'Desempenho', 'Erros recentes']
    const valor = indice => respostas[indice].status === 'fulfilled' ? respostas[indice].value : null
    return {
      componentes: valor(0)?.componentes ?? [],
      recursos: valor(1) ?? [],
      rotas: valor(2)?.rotas ?? [],
      limiteSegundos: valor(2)?.limiteSegundos ?? LIMITE_RESPOSTA_PADRAO,
      erros: valor(3)?.erros ?? [],
      errosParciais: valor(3)?.parcial ?? false,
      lidoEm: respostas.some(r => r.status === 'fulfilled') ? new Date() : null,
      falhas: respostas.flatMap((resposta, indice) => resposta.status === 'rejected'
        ? [`${nomes[indice]}: ${mensagemErroMonitoramento(resposta.reason)}`] : []),
    }
  },
  async saude({ signal } = {}) {
    const { data } = await api.get(`${BASE}/saude`, { signal })
    return {
      verificadoEm: data.verificadoEm,
      componentes: lista(data, 'componentes').map(c => ({
        nome: c.nome, estado: c.estado, qual: c.estadoRotulo, ms: c.latenciaMs,
        detalhe: c.detalhe,
      })),
    }
  },

  async recursos({ signal } = {}) {
    const { data } = await api.get(`${BASE}/recursos`, { signal })
    if (!data?.processador || !data.memoria || !data.disco || !data.acervo) {
      throw new Error('Resposta de consumo de recursos inválida.')
    }
    const gib = 1024 ** 3
    return [
      { k: 'CPU da aplicação', v: data.processador.usoProcessoPct, max: 100, un: '%', q: 'Uso do processo da aplicação' },
      { k: 'Memória da aplicação', v: data.memoria.heapUsadoBytes / gib, max: data.memoria.heapMaximoBytes > 0 ? data.memoria.heapMaximoBytes / gib : null, un: 'GiB', q: 'Memória heap utilizada' },
      { k: 'Disco utilizado', v: data.disco.usoPct, max: 100, un: '%', q: 'Disco onde a aplicação está em execução' },
      { k: 'Acervo catalogado', v: data.acervo.bytes / gib, max: null, un: 'GiB', q: `${data.acervo.arquivos} arquivos e ${data.acervo.membros} membros de arquivos compactados` },
    ]
  },

  async desempenho({ signal } = {}) {
    const { data } = await api.get(`${BASE}/desempenho`, { signal })
    return {
      limiteSegundos: data.limiteSegundos,
      rotas: lista(data, 'rotas').map(r => ({
        rota: `${r.metodo} ${r.rota}`, n: r.chamadas, err: r.erros,
        med: r.mediaMs / 1000, max: r.maximoMs / 1000,
      })),
    }
  },

  async erros({ minutos = 60, signal, agora = new Date() } = {}) {
    const inicio = agora.getTime() - minutos * 60000
    const dataLocal = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const { data } = await api.get(`${BASE}/erros`, {
      signal,
      params: { de: dataLocal(new Date(inicio)), ate: dataLocal(agora), limite: 500, deslocamento: 0 },
    })
    return {
      parcial: data.total > data.limite,
      erros: lista(data, 'erros').filter(e => {
        const instante = new Date(e.dataHora).getTime()
        return instante >= inicio && instante <= agora.getTime()
      }).map(e => ({
        id: e.id, h: new Date(e.dataHora).toLocaleTimeString('pt-BR'),
        msg: e.mensagem || e.excecao || 'Erro sem mensagem',
        rota: `${e.metodo} ${e.rota}`, status: e.status, origem: e.excecao || 'API',
      })),
    }
  },
}
