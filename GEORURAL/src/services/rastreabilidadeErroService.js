export function requisicaoCancelada(erro) {
  return (
    erro?.code === 'ERR_CANCELED' ||
    erro?.name === 'CanceledError' ||
    erro?.name === 'AbortError'
  )
}

function texto(valor) {
  return typeof valor === 'string'
    ? valor.trim()
    : ''
}

function mensagemBackend(dados) {
  if (!dados || typeof dados !== 'object') {
    return ''
  }

  return texto(dados.mensagem) || texto(dados.message)
}

export function obterMensagemErro(
  erro,
  mensagemPadrao = 'Não foi possível concluir a consulta.',
) {
  if (requisicaoCancelada(erro)) return ''

  const status = Number(
    erro?.response?.status ?? erro?.status,
  )

  const mensagem = mensagemBackend(erro?.response?.data)

  if (
    erro?.code === 'ECONNABORTED' ||
    erro?.code === 'ETIMEDOUT'
  ) {
    return 'A consulta demorou mais que o esperado. Tente novamente.'
  }

  if (status === 401) {
    return 'Sua sessão expirou. Entre novamente para continuar.'
  }

  if (status === 403) {
    return 'Você não tem permissão para consultar esses dados.'
  }

  if (status === 404) {
    return mensagem || 'O recurso solicitado não foi encontrado.'
  }

  if (status === 429) {
    return 'Muitas consultas foram realizadas. Aguarde um momento e tente novamente.'
  }

  if (status >= 500) {
    return 'O servidor não conseguiu concluir a consulta. Tente novamente.'
  }

  if (mensagem) {
    return mensagem
  }

  if (erro?.isAxiosError && !erro?.response) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão.'
  }

  return texto(erro?.message) || mensagemPadrao
}

export function prepararErroConsulta(erro, mensagemPadrao) {
  if (requisicaoCancelada(erro)) {
    return erro
  }

  const falha = new Error(
    obterMensagemErro(erro, mensagemPadrao),
    { cause: erro },
  )

  falha.status =
    erro?.response?.status ?? erro?.status ?? null

  return falha
}
