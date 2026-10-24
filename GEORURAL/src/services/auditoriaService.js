import api from './api'

let rotasConfiguradas = {
  resultados: '/api/linhagem/resultados',
  linhagem: id => `/api/linhagem/resultados/${encodeURIComponent(id)}`,
}

export function requisicaoAuditoriaCancelada(erro) {
  return (
    erro?.code === 'ERR_CANCELED' ||
    erro?.name === 'CanceledError' ||
    erro?.name === 'AbortError'
  )
}

export function validarIdAuditoria(valor) {
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

export function mensagemErroAuditoria(erro) {
  if (typeof erro === 'string') {
    return erro.trim() ||
      'Não foi possível consultar a auditoria.'
  }

  const status = erro?.response?.status

  if (status === 401) {
    return 'Sua sessão não está autorizada. Entre novamente no sistema.'
  }

  if (status === 403) {
    return 'Você não possui permissão para consultar a auditoria.'
  }

  if (status === 404) {
    return 'O registro ou a rota de auditoria não foi encontrado.'
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
    return 'O servidor não conseguiu consultar a auditoria. Tente novamente mais tarde.'
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

  return 'Não foi possível consultar a auditoria.'
}

export function configurarRotasAuditoria(rotas) {
  if (
    !rotas ||
    typeof rotas.resultados !== 'string' ||
    !rotas.resultados.startsWith('/') ||
    typeof rotas.linhagem !== 'function' ||
    typeof rotas.execucao !== 'function'
  ) {
    throw new Error(
      'Configure as rotas de resultados, linhagem e execução da auditoria.',
    )
  }

  rotasConfiguradas = {
    resultados: rotas.resultados,
    linhagem: rotas.linhagem,
    execucao: rotas.execucao,
  }
}

function obterCaminho(tipo, id) {
  if (!rotasConfiguradas) {
    throw new Error(
      'As rotas da auditoria ainda não foram configuradas com os endpoints do backend.',
    )
  }

  const rota = rotasConfiguradas[tipo]

  const caminho = typeof rota === 'function'
    ? rota(id)
    : rota

  if (
    typeof caminho !== 'string' ||
    !caminho.startsWith('/') ||
    caminho.startsWith('//')
  ) {
    throw new Error(
      'A rota de auditoria configurada é inválida.',
    )
  }

  return caminho
}

function validarObjeto(dados) {
  if (
    !dados ||
    typeof dados !== 'object' ||
    Array.isArray(dados)
  ) {
    throw new Error(
      'O backend retornou um detalhe de auditoria inválido.',
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
    'O backend retornou uma listagem de auditoria inválida.',
  )
}

async function executarConsulta(
  tipo,
  {
    id,
    params,
    signal,
    validar,
  } = {},
) {
  try {
    const identificador = id === undefined
      ? undefined
      : validarIdAuditoria(id)

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
    if (requisicaoAuditoriaCancelada(erro)) {
      throw erro
    }

    throw new Error(
      mensagemErroAuditoria(erro),
      { cause: erro },
    )
  }
}

export const auditoriaService = {
  listarResultados(
    filtros = {},
    { signal } = {},
  ) {
    return executarConsulta('resultados', {
      params: filtros,
      signal,
      validar: validarLista,
    })
  },

  consultarLinhagem(
    resultadoId,
    { signal } = {},
  ) {
    return executarConsulta('linhagem', {
      id: resultadoId,
      signal,
      validar: validarObjeto,
    })
  },

  consultarExecucao(
    execucaoId,
    { signal } = {},
  ) {
    return executarConsulta('execucao', {
      id: execucaoId,
      signal,
      validar: validarObjeto,
    })
  },
}
