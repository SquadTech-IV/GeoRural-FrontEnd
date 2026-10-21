import api from './api'

let rotasConfiguradas = null

export function requisicaoQuarentenaCancelada(erro) {
  return (
    erro?.code === 'ERR_CANCELED' ||
    erro?.name === 'CanceledError' ||
    erro?.name === 'AbortError'
  )
}

export function validarIdQuarentena(valor) {
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

export function configurarRotasQuarentena(rotas) {
  if (
    !rotas ||
    typeof rotas.execucoes !== 'string' ||
    typeof rotas.registros !== 'function' ||
    typeof rotas.detalhe !== 'function'
  ) {
    throw new Error(
      'Configure as rotas de execuções, registros e detalhes da quarentena.',
    )
  }

  validarCaminho(rotas.execucoes)

  rotasConfiguradas = {
    execucoes: rotas.execucoes,
    registros: rotas.registros,
    detalhe: rotas.detalhe,
  }
}

function validarCaminho(caminho) {
  if (
    typeof caminho !== 'string' ||
    !caminho.startsWith('/') ||
    caminho.startsWith('//')
  ) {
    throw new Error(
      'A rota de quarentena configurada é inválida.',
    )
  }

  return caminho
}

function obterCaminho(tipo, id) {
  if (!rotasConfiguradas) {
    throw new Error(
      'As rotas da quarentena ainda não foram configuradas com os endpoints do backend.',
    )
  }

  const rota = rotasConfiguradas[tipo]

  return validarCaminho(
    typeof rota === 'function'
      ? rota(id)
      : rota,
  )
}

function validarObjeto(dados) {
  if (
    !dados ||
    typeof dados !== 'object' ||
    Array.isArray(dados)
  ) {
    throw new Error(
      'O backend retornou um registro de quarentena inválido.',
    )
  }

  return dados
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
    'O backend retornou uma listagem de quarentena inválida.',
  )
}

export function mensagemErroQuarentena(erro) {
  if (typeof erro === 'string') {
    return erro.trim() ||
      'Não foi possível consultar a quarentena.'
  }

  const status = erro?.response?.status

  if (status === 401) {
    return 'Sua sessão não está autorizada. Entre novamente no sistema.'
  }

  if (status === 403) {
    return 'Você não possui permissão para consultar os registros em quarentena.'
  }

  if (status === 404) {
    return 'O registro ou a rota de quarentena não foi encontrado.'
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
    return 'O servidor não conseguiu consultar a quarentena. Tente novamente mais tarde.'
  }

  const dados = erro?.response?.data

  const mensagem =
    typeof dados?.mensagem === 'string'
      ? dados.mensagem.trim()
      : typeof dados?.message === 'string'
        ? dados.message.trim()
        : ''

  if (
    status >= 400 &&
    status < 500 &&
    mensagem
  ) {
    return mensagem
  }

  if (
    !erro?.isAxiosError &&
    typeof erro?.message === 'string' &&
    erro.message.trim()
  ) {
    return erro.message.trim()
  }

  return 'Não foi possível consultar a quarentena.'
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
      : validarIdQuarentena(id)

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
    if (requisicaoQuarentenaCancelada(erro)) {
      throw erro
    }

    throw new Error(
      mensagemErroQuarentena(erro),
      { cause: erro },
    )
  }
}

export const quarentenaService = {
  listarExecucoes(
    filtros = {},
    { signal } = {},
  ) {
    return executarConsulta('execucoes', {
      params: filtros,
      signal,
      validar: validarLista,
    })
  },

  listarRegistros(
    execucaoId,
    filtros = {},
    { signal } = {},
  ) {
    return executarConsulta('registros', {
      id: execucaoId,
      params: filtros,
      signal,
      validar: validarLista,
    })
  },

  consultarRegistro(
    registroId,
    { signal } = {},
  ) {
    return executarConsulta('detalhe', {
      id: registroId,
      signal,
      validar: validarObjeto,
    })
  },
}
