export function requisicaoQuarentenaCancelada(erro) {
  return (
    erro?.code === 'ERR_CANCELED' ||
    erro?.name === 'CanceledError' ||
    erro?.name === 'AbortError'
  )
}

export function mensagemErroQuarentena(erro) {
  if (requisicaoQuarentenaCancelada(erro)) {
    return ''
  }

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
    return 'O registro ou o serviço de quarentena não foi encontrado.'
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

  if (status === 409) {
    return 'O registro foi alterado ou não está disponível para esta operação. Atualize a consulta.'
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

export async function executarConsultaQuarentena(
  operacao,
) {
  try {
    return await operacao()
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
