export function mensagemErroApi(
  erro,
  mensagemPadrao = 'Não foi possível concluir a operação.',
) {
  const status = erro?.response?.status
  const dados = erro?.response?.data

  if (status === 401) {
    return 'Sua sessão expirou. Entre novamente para continuar.'
  }

  if (status === 403) {
    return 'Você não tem permissão para realizar esta operação.'
  }

  if (status === 404) {
    return 'Os dados solicitados não foram encontrados.'
  }

  if (status === 409) {
    return (
      'Os dados foram alterados por outra operação. ' +
      'Atualize o indicador e revise os parâmetros antes de salvar.'
    )
  }

  if (status === 429) {
    return 'Muitas requisições foram realizadas. Aguarde e tente novamente.'
  }

  if (status >= 500) {
    return 'O servidor não conseguiu concluir a operação. Tente novamente.'
  }

  if (
    erro?.code === 'ECONNABORTED' ||
    erro?.code === 'ETIMEDOUT'
  ) {
    return 'O servidor demorou para responder. Tente novamente.'
  }

  if (erro?.code === 'ERR_NETWORK') {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão.'
  }

  const mensagem =
    dados?.mensagem ||
    dados?.message ||
    (typeof dados === 'string' ? dados : null)

  if (typeof mensagem === 'string' && mensagem.trim()) {
    return mensagem
  }

  if (erro?.code === 'API_NAO_CONFIGURADA') {
    return erro.message
  }

  return mensagemPadrao
}
