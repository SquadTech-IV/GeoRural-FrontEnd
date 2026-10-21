import api from './api'

let rotasConfiguradas = null

export function requisicaoZonaTratadaCancelada(erro) {
  return (
    erro?.code === 'ERR_CANCELED' ||
    erro?.name === 'CanceledError' ||
    erro?.name === 'AbortError'
  )
}

export function validarIdZonaTratada(valor) {
  if (
    typeof valor === 'number' &&
    !Number.isSafeInteger(valor)
  ) {
    throw new Error(
      'O identificador informado é inválido.',
    )
  }

  const id = String(valor ?? '').trim()

  if (!/^[1-9]\d*$/.test(id)) {
    throw new Error(
      'Informe um identificador válido.',
    )
  }

  return id
}

function validarCaminho(caminho) {
  if (
    typeof caminho !== 'string' ||
    !caminho.startsWith('/') ||
    caminho.startsWith('//')
  ) {
    throw new Error(
      'A rota da zona tratada configurada é inválida.',
    )
  }

  return caminho
}

export function configurarRotasZonaTratada(rotas) {
  if (
    !rotas ||
    typeof rotas.conjuntos !== 'string' ||
    typeof rotas.transformacoes !== 'function' ||
    typeof rotas.processamento !== 'function'
  ) {
    throw new Error(
      'Configure as rotas de conjuntos, transformações e processamento da zona tratada.',
    )
  }

  validarCaminho(rotas.conjuntos)

  rotasConfiguradas = {
    conjuntos: rotas.conjuntos,
    transformacoes: rotas.transformacoes,
    processamento: rotas.processamento,
  }
}

function obterCaminho(tipo, id) {
  if (!rotasConfiguradas) {
    throw new Error(
      'As rotas da zona tratada ainda não foram configuradas com os endpoints do backend.',
    )
  }

  const rota = rotasConfiguradas[tipo]

  return validarCaminho(
    typeof rota === 'function'
      ? rota(id)
      : rota,
  )
}

function validarLista(dados) {
  if (Array.isArray(dados)) {
    return dados
  }

  if (
    dados &&
    typeof dados === 'object' &&
    Array.isArray(dados.content)
  ) {
    return dados
  }

  throw new Error(
    'O backend retornou uma listagem da zona tratada inválida.',
  )
}

function validarObjeto(dados) {
  if (
    !dados ||
    typeof dados !== 'object' ||
    Array.isArray(dados)
  ) {
    throw new Error(
      'O backend retornou informações de processamento inválidas.',
    )
  }

  return dados
}

export function mensagemErroZonaTratada(erro) {
  if (requisicaoZonaTratadaCancelada(erro)) {
    return ''
  }

  if (typeof erro === 'string') {
    return erro.trim() ||
      'Não foi possível consultar a zona tratada.'
  }

  const status = erro?.response?.status

  if (status === 401) {
    return 'Sua sessão não está autorizada. Entre novamente no sistema.'
  }

  if (status === 403) {
    return 'Você não possui permissão para consultar a zona tratada.'
  }

  if (status === 404) {
    return 'O registro ou o serviço da zona tratada não foi encontrado.'
  }

  if (
    status === 408 ||
    status === 504 ||
    erro?.code === 'ECONNABORTED' ||
    erro?.code === 'ETIMEDOUT'
  ) {
    return 'A consulta demorou mais que o permitido. Tente novamente.'
  }

  if (status === 429) {
    return 'Muitas consultas foram realizadas. Aguarde um momento e tente novamente.'
  }

  if (erro?.isAxiosError && !erro.response) {
    return 'Não foi possível acessar o backend. Verifique a conexão e tente novamente.'
  }

  if (status >= 500) {
    return 'O servidor não conseguiu consultar a zona tratada. Tente novamente mais tarde.'
  }

  const dados = erro?.response?.data

  const mensagemServidor =
    typeof dados?.mensagem === 'string'
      ? dados.mensagem.trim()
      : typeof dados?.message === 'string'
        ? dados.message.trim()
        : ''

  if (
    status >= 400 &&
    status < 500 &&
    mensagemServidor
  ) {
    return mensagemServidor
  }

  if (status === 400 || status === 422) {
    return 'Os parâmetros da consulta são inválidos. Confira os dados informados.'
  }

  if (
    !erro?.isAxiosError &&
    typeof erro?.message === 'string' &&
    erro.message.trim()
  ) {
    return erro.message.trim()
  }

  return 'Não foi possível consultar a zona tratada.'
}

async function executarConsulta(
  tipo,
  {
    id,
    params,
    signal,
    validar,
  },
) {
  try {
    const identificador = id === undefined
      ? undefined
      : validarIdZonaTratada(id)

    const caminho = obterCaminho(
      tipo,
      identificador,
    )

    const { data } = await api.get(caminho, {
      params,
      signal,
      timeout: 30000,
    })

    return validar(data)
  } catch (erro) {
    if (requisicaoZonaTratadaCancelada(erro)) {
      throw erro
    }

    throw new Error(
      mensagemErroZonaTratada(erro),
      { cause: erro },
    )
  }
}

export const zonaTratadaService = {
  listarConjuntos(
    filtros = {},
    { signal } = {},
  ) {
    return executarConsulta('conjuntos', {
      params: filtros,
      signal,
      validar: validarLista,
    })
  },

  consultarTransformacoes(
    execucaoId,
    { signal } = {},
  ) {
    return executarConsulta('transformacoes', {
      id: execucaoId,
      signal,
      validar: validarLista,
    })
  },

  consultarProcessamento(
    execucaoId,
    { signal } = {},
  ) {
    return executarConsulta('processamento', {
      id: execucaoId,
      signal,
      validar: validarObjeto,
    })
  },
}
