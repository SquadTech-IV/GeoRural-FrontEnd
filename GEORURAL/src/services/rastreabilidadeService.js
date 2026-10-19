import api from './api'

const ROTAS = {
  conjuntos: '/api/rastreabilidade/conjuntos',

  arquivos: (conjuntoId) =>
    `/api/rastreabilidade/conjuntos/${conjuntoId}/arquivos`,

  trajetoria: (arquivoId) =>
    `/api/rastreabilidade/arquivos/${arquivoId}/trajetoria`,

  movimentacao: (movimentacaoId) =>
    `/api/rastreabilidade/movimentacoes/${movimentacaoId}`,
}

function validarId(valor, nome) {
  const id = String(valor ?? '').trim()

  if (!/^[1-9]\d*$/.test(id)) {
    throw new Error(
      `Informe um identificador válido para ${nome}.`,
    )
  }

  return id
}

function requisicaoCancelada(erro) {
  return (
    erro?.code === 'ERR_CANCELED' ||
    erro?.name === 'CanceledError' ||
    erro?.name === 'AbortError'
  )
}

function mensagemDaApi(dados) {
  if (!dados || typeof dados !== 'object') {
    return ''
  }

  const mensagem = dados.mensagem ?? dados.message

  return typeof mensagem === 'string'
    ? mensagem.trim()
    : ''
}

function tratarErro(erro, mensagemPadrao) {
  if (requisicaoCancelada(erro)) {
    return erro
  }

  const status = erro?.response?.status
  const mensagemBackend = mensagemDaApi(
    erro?.response?.data,
  )

  let mensagem = mensagemPadrao

  if (erro?.code === 'ECONNABORTED') {
    mensagem =
      'A consulta demorou mais que o esperado. Tente novamente.'
  } else if (!erro?.response) {
    mensagem =
      'Não foi possível conectar ao servidor. Verifique sua conexão.'
  } else if (status === 401) {
    mensagem =
      'Sua sessão expirou. Entre novamente para continuar.'
  } else if (status === 403) {
    mensagem =
      'Você não tem permissão para consultar esses dados.'
  } else if (status === 404) {
    mensagem =
      mensagemBackend || 'O recurso solicitado não foi encontrado.'
  } else if (status >= 500) {
    mensagem =
      'O servidor não conseguiu concluir a consulta. Tente novamente.'
  } else if (mensagemBackend) {
    mensagem = mensagemBackend
  }

  const falha = new Error(mensagem, {
    cause: erro,
  })

  falha.status = status ?? null

  return falha
}

async function consultar(caminho, signal, mensagemErro) {
  try {
    const resposta = await api.get(caminho, {
      signal,
    })

    return resposta.data
  } catch (erro) {
    throw tratarErro(erro, mensagemErro)
  }
}

function normalizarLista(dados, nome) {
  const lista = Array.isArray(dados)
    ? dados
    : dados?.content

  if (!Array.isArray(lista)) {
    throw new Error(
      `O servidor retornou uma lista de ${nome} inválida.`,
    )
  }

  if (
    lista.some(
      (item) =>
        !item ||
        typeof item !== 'object' ||
        Array.isArray(item),
    )
  ) {
    throw new Error(
      `O servidor retornou registros de ${nome} inválidos.`,
    )
  }

  return lista
}

function normalizarObjeto(dados, nome) {
  if (
    !dados ||
    typeof dados !== 'object' ||
    Array.isArray(dados)
  ) {
    throw new Error(
      `O servidor retornou ${nome} inválido.`,
    )
  }

  return dados
}

async function listarConjuntos({ signal } = {}) {
  const dados = await consultar(
    ROTAS.conjuntos,
    signal,
    'Não foi possível consultar os conjuntos.',
  )

  return normalizarLista(dados, 'conjuntos')
}

async function listarArquivos(
  conjuntoId,
  { signal } = {},
) {
  const id = validarId(conjuntoId, 'o conjunto')

  const dados = await consultar(
    ROTAS.arquivos(id),
    signal,
    'Não foi possível consultar os arquivos do conjunto.',
  )

  return normalizarLista(dados, 'arquivos')
}

async function consultarTrajetoria(
  arquivoId,
  { signal } = {},
) {
  const id = validarId(arquivoId, 'o arquivo')

  const dados = await consultar(
    ROTAS.trajetoria(id),
    signal,
    'Não foi possível consultar a trajetória do arquivo.',
  )

  const trajetoria = normalizarObjeto(
    dados,
    'uma trajetória',
  )

  if (!Array.isArray(trajetoria.passagens)) {
    throw new Error(
      'O servidor retornou uma trajetória sem uma lista válida de passagens.',
    )
  }

  return {
    ...trajetoria,
    passagens: normalizarLista(
      trajetoria.passagens,
      'passagens',
    ),
  }
}

async function consultarMovimentacao(
  movimentacaoId,
  { signal } = {},
) {
  const id = validarId(
    movimentacaoId,
    'a movimentação',
  )

  const dados = await consultar(
    ROTAS.movimentacao(id),
    signal,
    'Não foi possível consultar a movimentação.',
  )

  return normalizarObjeto(
    dados,
    'um detalhamento de movimentação',
  )
}

export const rastreabilidadeService = {
  listarConjuntos,
  listarArquivos,
  consultarTrajetoria,
  consultarMovimentacao,
}
