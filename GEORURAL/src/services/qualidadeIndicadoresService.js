import api from './api'

const ROTAS = {
  lista: '/api/qualidade/indicadores',
  resultados: (versaoId) => `/api/qualidade/indicadores/versoes/${versaoId}`,
}

export function requisicaoIndicadoresCancelada(erro) {
  return (
    erro?.code === 'ERR_CANCELED' || erro?.name === 'CanceledError' || erro?.name === 'AbortError'
  )
}

function validarLista(dados) {
  if (!Array.isArray(dados)) {
    throw new Error('O backend retornou uma lista de indicadores inválida.')
  }
  return dados
}

export function mensagemErroIndicadores(erro) {
  if (requisicaoIndicadoresCancelada(erro)) return ''

  const status = erro?.response?.status
  if (status === 404) return 'O serviço de indicadores publicados não foi encontrado.'
  if (status === 401 || status === 403) {
    return 'Você não tem permissão para consultar os indicadores publicados.'
  }
  if (erro?.isAxiosError && !erro.response) {
    return 'Não foi possível acessar o backend. Verifique a conexão e tente novamente.'
  }
  if (typeof status === 'number' && status >= 500) {
    return 'O servidor não conseguiu consultar os indicadores. Tente novamente mais tarde.'
  }

  const mensagemServidor =
    typeof erro?.response?.data?.mensagem === 'string'
      ? erro.response.data.mensagem.trim()
      : typeof erro?.response?.data?.message === 'string'
        ? erro.response.data.message.trim()
        : ''

  if (mensagemServidor) return mensagemServidor
  if (typeof erro?.message === 'string' && erro.message.trim()) return erro.message.trim()

  return 'Não foi possível consultar os indicadores publicados.'
}

async function obter(rota, params, signal) {
  const { data } = await api.get(rota, { params, signal, timeout: 30000 })
  return data
}

async function executar(operacao) {
  try {
    return await operacao()
  } catch (erro) {
    if (requisicaoIndicadoresCancelada(erro)) throw erro
    throw new Error(mensagemErroIndicadores(erro), { cause: erro })
  }
}

function calcularDetalheVersao(versaoItem, indicadoresPublicados, resultadosImoveis) {
  const aprovadas = Number(versaoItem.aprovadas ?? 0)
  const rejeitadas = Number(versaoItem.rejeitadas ?? 0)
  const recebidas = Number(versaoItem.recebidas ?? aprovadas + rejeitadas)

  const percentual = recebidas > 0 ? Math.round((aprovadas / recebidas) * 100) : 100

  const indicadoresDaVersao = indicadoresPublicados.filter(
    (ind) => String(ind.versaoId) === String(versaoItem.id),
  )

  const blocos = indicadoresDaVersao.map((ind) => {
    const bom = Number(ind.conformes ?? ind.aprovados ?? 0)
    const ruim = Number(ind.naoConformes ?? ind.reprovados ?? 0)
    const total = bom + ruim
    const pctBom = total > 0 ? Math.round((bom / total) * 100) : 0

    return {
      titulo: ind.nome || ind.indicador || 'Indicador',
      vazio: total === 0,
      total,
      pctBom,
      bom: { rotulo: 'Conformes', valor: bom },
      ruim: { rotulo: 'Não conformes', valor: ruim },
      comparacao: ind.comparacao ?? null,
    }
  })

  const regrasQueFalharam = Array.isArray(versaoItem.regrasQueFalharam)
    ? versaoItem.regrasQueFalharam
    : []

  const temBloqueio = regrasQueFalharam.some((r) => r.severidade === 'BLOQUEIA')

  const conclusao = versaoItem.conclusao ?? {
    classe: temBloqueio ? 'erro' : rejeitadas > 0 ? 'aviso' : 'sucesso',
    texto: temBloqueio
      ? 'Bloqueada por regras'
      : rejeitadas > 0
        ? 'Atenção na quarentena'
        : 'Pronta para publicar',
  }

  return {
    conclusao,
    recebidas,
    entraram: aprovadas,
    quarentena: rejeitadas,
    imoveisCalculados: resultadosImoveis.length > 0 ? resultadosImoveis.length : null,
    percentual,
    percentualTexto: percentual.toLocaleString('pt-BR'),
    blocos,
    regrasQueFalharam,
    motivos: Array.isArray(versaoItem.motivos) ? versaoItem.motivos : [],
  }
}

export const qualidadeIndicadoresService = {
  listar(indicador, { signal } = {}) {
    return executar(async () =>
      validarLista(await obter(ROTAS.lista, { indicador: indicador || 'TODOS' }, signal)),
    )
  },

  resultados(versaoId, indicador, { signal } = {}) {
    return executar(async () =>
      validarLista(
        await obter(ROTAS.resultados(versaoId), { indicador: indicador || 'TODOS' }, signal),
      ),
    )
  },

  carregarDetalhe(versaoItem, { signal } = {}) {
    return executar(async () => {
      const [indicadoresPublicados, resultadosImoveis] = await Promise.all([
        this.listar('TODOS', { signal }),
        this.resultados(versaoItem.id, 'TODOS', { signal }).catch(() => []),
      ])

      return calcularDetalheVersao(versaoItem, indicadoresPublicados, resultadosImoveis)
    })
  },
}

export default qualidadeIndicadoresService
