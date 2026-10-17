import api from './api'

export function mensagemErro(
  erro,
  padrao = 'Não foi possível concluir a operação.',
) {
  if (
    erro?.message &&
    !erro.response &&
    erro.code !== 'ERR_NETWORK' &&
    erro.code !== 'ECONNABORTED'
  ) {
    return erro.message
  }

  const status = erro?.response?.status

  if (status === 401) {
    return 'Sua sessão expirou. Entre novamente.'
  }

  if (status === 403) {
    return 'Você não tem permissão para esta operação.'
  }

  if (status >= 500) {
    return 'O servidor não conseguiu concluir a operação.'
  }

  return (
    erro?.response?.data?.mensagem ||
    erro?.response?.data?.message ||
    padrao
  )
}

export function normalizarValor(valor) {
  return valor == null ? '' : String(valor).trim()
}

export function dataValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false
  }

  const [ano, mes, dia] = valor.split('-').map(Number)
  const data = new Date(0)

  data.setUTCFullYear(ano, mes - 1, dia)

  return (
    ano >= 1 &&
    data.getUTCFullYear() === ano &&
    data.getUTCMonth() === mes - 1 &&
    data.getUTCDate() === dia
  )
}

export function validarParametro(parametro, entrada) {
  const valor = normalizarValor(entrada)

  if (!valor) {
    return 'Preencha este campo.'
  }

  if (parametro.tipo === 'data') {
    return dataValida(valor) ? '' : 'Informe uma data válida.'
  }

  if (parametro.tipo === 'texto') {
    return ''
  }

  if (!['numero', 'percentual'].includes(parametro.tipo)) {
    return 'Tipo de parâmetro não suportado.'
  }

  const formatoNumerico =
    /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/

  if (
    !formatoNumerico.test(valor) ||
    !Number.isFinite(Number(valor))
  ) {
    return 'Informe um número válido.'
  }

  const numero = Number(valor)

  if (
    parametro.tipo === 'percentual' &&
    (numero < 0 || numero > 100)
  ) {
    return 'O percentual deve estar entre 0 e 100.'
  }

  if (parametro.tipo === 'numero' && numero <= 0) {
    return 'O valor deve ser maior que zero.'
  }

  return ''
}

export function validarParametros(parametros, valores) {
  return Object.fromEntries(
    parametros.map((parametro) => [
      parametro.id,
      validarParametro(parametro, valores[parametro.id]),
    ]),
  )
}

export function prepararEdicao(indicador, valores) {
  if (!indicador?.possuiParametros) {
    throw new Error(
      'Este indicador não possui parâmetros editáveis.',
    )
  }

  const erros = validarParametros(indicador.parametros, valores)

  if (Object.values(erros).some(Boolean)) {
    throw new Error('Revise os parâmetros antes de continuar.')
  }

  const possuiAlteracao = indicador.parametros.some(
    (parametro) =>
      normalizarValor(valores[parametro.id]) !==
      normalizarValor(parametro.valor),
  )

  if (!possuiAlteracao) {
    throw new Error('Nenhum parâmetro foi alterado.')
  }

  return {
    indicadorId: indicador.id,
    versaoBase: indicador.versaoVigente,
    parametros: indicador.parametros.map((parametro) => ({
      id: parametro.id,
      valor: normalizarValor(valores[parametro.id]),
    })),
  }
}

export function validarConfirmacao(autor, motivo) {
  return {
    autor: normalizarValor(autor)
      ? ''
      : 'Informe o autor da alteração.',
    motivo: normalizarValor(motivo)
      ? ''
      : 'Informe o motivo da alteração.',
  }
}

export function dadosPendentesValidos(indicador, pendentes) {
  return Boolean(
    indicador &&
    pendentes &&
    String(indicador.id) === String(pendentes.indicadorId) &&
    Array.isArray(pendentes.parametros) &&
    pendentes.parametros.length,
  )
}

export function formatarData(valor) {
  const partes = String(valor ?? '')
    .match(/^(\d{4})-(\d{2})-(\d{2})/)

  return partes
    ? `${partes[3]}/${partes[2]}/${partes[1]}`
    : '—'
}

export function formatarValorParametro(
  parametro,
  tipo = parametro?.tipo,
  unidade = parametro?.unidade,
) {
  if (!parametro) {
    return 'Não consta'
  }

  const valor = parametro.valor

  if (valor == null || valor === '') {
    return '—'
  }

  if (tipo === 'data') {
    return formatarData(valor)
  }

  const texto =
    ['numero', 'percentual'].includes(tipo) &&
    Number.isFinite(Number(valor))
      ? Number(valor).toLocaleString('pt-BR', {
          maximumFractionDigits: 15,
        })
      : String(valor)

  return `${texto}${unidade && unidade !== 'data' ? ` ${unidade}` : ''}`
}

export function possuiParametros(indicador) {
  return indicador?.possuiParametros === true
}

export function agruparIndicadores(indicadores) {
  return [
    {
      id: 'configuraveis',
      titulo: 'Com valores a configurar',
      descricao: 'Indicadores com parâmetros configuráveis.',
      indicadores: indicadores.filter(possuiParametros),
    },
    {
      id: 'consulta',
      titulo: 'Sem valores a configurar',
      descricao: 'Métodos de cálculo disponíveis para consulta.',
      indicadores: indicadores.filter(
        (indicador) => !possuiParametros(indicador),
      ),
    },
  ]
}

function normalizarParametro(parametro) {
  const tipo = String(parametro.tipo).toLowerCase()

  return {
    ...parametro,
    id: parametro.nome,
    tipo,
    tipoApi: parametro.tipo,
    obrigatorio: true,
    positivo: tipo === 'numero',
  }
}

function normalizarRegra(regra) {
  if (
    !regra ||
    !Array.isArray(regra.parametros) ||
    !regra.versao
  ) {
    throw new Error('O servidor retornou uma regra incompleta.')
  }

  return {
    ...regra,
    numero: String(regra.versao).replace(/^v/i, ''),
    criadaEm: regra.dataCriacao,
    vigente: regra.vigente === 'S',
    parametros: regra.parametros.map(normalizarParametro),
  }
}

function normalizarIndicador(indicador, vigente, historico) {
  if (!indicador?.sigla || !Array.isArray(historico)) {
    throw new Error(
      'O servidor retornou um indicador incompleto.',
    )
  }

  return {
    ...indicador,
    id: indicador.sigla,
    backendId: indicador.id,
    codigo: indicador.sigla,
    formula: vigente?.formula ?? '',
    parametros: vigente?.parametros ?? [],
    possuiParametros: Boolean(vigente?.parametros.length),
    versaoVigente: vigente?.versao ?? null,
    versoes: historico,
  }
}

function caminho(sigla) {
  if (!normalizarValor(sigla)) {
    throw new Error('Selecione um indicador.')
  }

  return `/api/indicadores/${encodeURIComponent(sigla)}`
}

export function montarPayload(dados, indicador) {
  if (!dadosPendentesValidos(indicador, dados)) {
    throw new Error('Revise os parâmetros do indicador.')
  }

  const erros = validarConfirmacao(dados.autor, dados.motivo)

  if (erros.autor || erros.motivo) {
    throw new Error(erros.autor || erros.motivo)
  }

  if (dados.versaoBase !== indicador.versaoVigente) {
    throw new Error(
      'A versão vigente mudou. Atualize o indicador antes de salvar.',
    )
  }

  const entradas = new Map(
    dados.parametros.map((parametro) => [
      parametro.id,
      parametro.valor,
    ]),
  )

  if (
    entradas.size !== indicador.parametros.length ||
    dados.parametros.length !== indicador.parametros.length ||
    indicador.parametros.some(
      (parametro) => !entradas.has(parametro.id),
    )
  ) {
    throw new Error(
      'Envie todos os parâmetros da versão vigente.',
    )
  }

  prepararEdicao(indicador, Object.fromEntries(entradas))

  return {
    autor: dados.autor.trim(),
    motivo: dados.motivo.trim(),
    parametros: indicador.parametros.map((parametro) => ({
      nome: parametro.nome,
      tipo: parametro.tipoApi,
      unidade: parametro.unidade,
      valor: normalizarValor(entradas.get(parametro.id)),
    })),
  }
}

export const regraService = {
  async listarIndicadores() {
    const { data } = await api.get('/api/indicadores')

    if (!Array.isArray(data)) {
      throw new Error('Lista de indicadores inválida.')
    }

    return Promise.all(
      data.map((indicador) =>
        this.obterIndicador(indicador.sigla),
      ),
    )
  },

  async obterIndicador(sigla) {
    const base = caminho(sigla)

    const [indicador, historico, vigente] = await Promise.all([
      api.get(base),
      api.get(`${base}/regras/historico`),
      api.get(`${base}/regras`).catch((erro) => {
        if (erro.response?.status === 404) {
          return { data: null }
        }

        throw erro
      }),
    ])

    if (!Array.isArray(historico.data)) {
      throw new Error('Histórico inválido.')
    }

    return normalizarIndicador(
      indicador.data,
      vigente.data ? normalizarRegra(vigente.data) : null,
      historico.data.map(normalizarRegra),
    )
  },

  async criarVersao(dados) {
    const atual = await this.obterIndicador(dados.indicadorId)
    const payload = montarPayload(dados, atual)

    let resposta

    try {
      resposta = await api.post(
        `${caminho(dados.indicadorId)}/regras`,
        payload,
      )
    } catch (erro) {
      if (!erro.response) {
        throw new Error(
          'A conexão foi interrompida antes da confirmação. ' +
          'Consulte o histórico antes de tentar novamente.',
          { cause: erro },
        )
      }

      throw erro
    }

    try {
      const nova = normalizarRegra(resposta.data)

      return {
        ...atual,
        formula: nova.formula,
        parametros: nova.parametros,
        possuiParametros: Boolean(nova.parametros.length),
        versaoVigente: nova.versao,
        versoes: [
          nova,
          ...atual.versoes.map((versao) => ({
            ...versao,
            vigente: false,
          })),
        ],
      }
    } catch {
      throw new Error(
        'A versão foi recebida pelo servidor, mas a resposta é inválida. ' +
        'Consulte o histórico antes de tentar novamente.',
      )
    }
  },
}

function mapaParametros(versao) {
  const lista = Array.isArray(versao?.parametros)
    ? versao.parametros
    : []

  return new Map(
    lista.map((parametro) => [
      String(parametro.id),
      parametro,
    ]),
  )
}

function definicaoParametro(id, indicador) {
  const lista = indicador?.parametros

  if (!Array.isArray(lista)) {
    return null
  }

  return lista.find(
    (parametro) => String(parametro.id) === id,
  ) ?? null
}

function valorNormalizado(parametro, tipo) {
  if (!parametro) {
    return 'ausente'
  }

  const valor = parametro.valor

  if (valor == null || valor === '') {
    return 'vazio'
  }

  if (tipo === 'data') {
    return `data:${String(valor).slice(0, 10)}`
  }

  if (tipo === 'numero' || tipo === 'percentual') {
    const numero = Number(valor)

    if (Number.isFinite(numero)) {
      return `numero:${numero}`
    }
  }

  return `texto:${String(valor)}`
}

export function compararParametros(versaoA, versaoB, indicador) {
  if (!versaoA || !versaoB) {
    return []
  }

  const parametrosA = mapaParametros(versaoA)
  const parametrosB = mapaParametros(versaoB)

  const ids = new Set([
    ...parametrosA.keys(),
    ...parametrosB.keys(),
  ])

  return [...ids].map((id) => {
    const parametroA = parametrosA.get(id)
    const parametroB = parametrosB.get(id)
    const definicao = definicaoParametro(id, indicador)

    const tipoA = parametroA?.tipo ?? definicao?.tipo
    const tipoB = parametroB?.tipo ?? definicao?.tipo

    const unidadeA = parametroA?.unidade ?? definicao?.unidade
    const unidadeB = parametroB?.unidade ?? definicao?.unidade

    let situacao = 'Igual'

    if (!parametroA) {
      situacao = 'Somente na segunda versão'
    } else if (!parametroB) {
      situacao = 'Somente na primeira versão'
    } else if (
      valorNormalizado(parametroA, tipoA) !==
        valorNormalizado(parametroB, tipoB) ||
      tipoA !== tipoB ||
      unidadeA !== unidadeB
    ) {
      situacao = 'Alterado'
    }

    return {
      id,
      nome:
        parametroA?.nome ||
        parametroB?.nome ||
        definicao?.nome ||
        id,
      parametroA,
      parametroB,
      tipoA,
      tipoB,
      unidadeA,
      unidadeB,
      situacao,
      diferente: situacao !== 'Igual',
    }
  })
}
