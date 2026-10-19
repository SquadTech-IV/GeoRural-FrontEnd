export function requisicaoCancelada(erro) {
  return (
    erro?.code === 'ERR_CANCELED' ||
    erro?.name === 'CanceledError' ||
    erro?.name === 'AbortError'
  )
}

export function obterMensagemErro(
  erro,
  mensagemPadrao = 'Não foi possível concluir a consulta.',
) {
  if (requisicaoCancelada(erro)) return ''

  if (erro?.tratado && typeof erro.message === 'string') {
    return erro.message
  }

  const status = Number(
    erro?.response?.status ?? erro?.status,
  )

  const dados = erro?.response?.data
  const mensagem = dados?.mensagem ?? dados?.message

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

  if (status === 429) {
    return 'Muitas consultas foram realizadas. Aguarde e tente novamente.'
  }

  if (status >= 500) {
    return 'O servidor não conseguiu concluir a consulta. Tente novamente.'
  }

  if (typeof mensagem === 'string' && mensagem.trim()) {
    return mensagem.trim()
  }

  if (status === 404) {
    return 'O recurso solicitado não foi encontrado.'
  }

  if (erro?.isAxiosError && !erro?.response) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão.'
  }

  return (
    typeof erro?.message === 'string' &&
    erro.message.trim()
  )
    ? erro.message
    : mensagemPadrao
}

export function prepararErroConsulta(erro, mensagemPadrao) {
  if (requisicaoCancelada(erro)) {
    return erro
  }

  const falha = new Error(
    obterMensagemErro(erro, mensagemPadrao),
    { cause: erro },
  )

  falha.tratado = true
  falha.status =
    erro?.response?.status ?? erro?.status ?? null

  return falha
}
