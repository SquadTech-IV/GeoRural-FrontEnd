const mensagensPadrao = {
  listar: 'Não foi possível consultar os arquivos recebidos.',
  detalhe: 'Não foi possível consultar os detalhes do arquivo.',
  download: 'Não foi possível baixar o arquivo original.',
}

export function consultaArquivoCancelada(erro) {
  return (
    erro?.code === 'ERR_CANCELED' ||
    erro?.name === 'CanceledError' ||
    erro?.name === 'AbortError'
  )
}

async function obterCorpoErro(erro) {
  const dados = erro?.response?.data

  if (
    typeof Blob !== 'undefined' &&
    dados instanceof Blob
  ) {
    if (dados.size > 65536) return null

    try {
      return JSON.parse(await dados.text())
    } catch {
      return null
    }
  }

  if (
    dados &&
    typeof dados === 'object' &&
    !Array.isArray(dados)
  ) {
    return dados
  }

  return null
}

export async function mensagemErroArquivo(
  erro,
  operacao = 'listar',
) {
  const status = erro?.response?.status

  const padrao =
    mensagensPadrao[operacao] ||
    'Não foi possível concluir a operação.'

  if (
    erro?.code === 'ECONNABORTED' ||
    erro?.code === 'ETIMEDOUT' ||
    status === 408 ||
    status === 504
  ) {
    return 'O servidor demorou para responder. Tente novamente.'
  }

  if (erro?.isAxiosError && !erro.response) {
    return 'Não foi possível acessar o servidor. Verifique a conexão e se o backend está em execução.'
  }

  if (status === 401) {
    return 'Sua sessão não está autorizada. Entre novamente no sistema.'
  }

  if (status === 403) {
    return 'Você não possui permissão para executar esta operação.'
  }

  if (status === 404) {
    if (operacao === 'download') {
      return 'O conteúdo original não foi encontrado para download.'
    }

    if (operacao === 'detalhe') {
      return 'O arquivo solicitado não foi encontrado.'
    }

    return 'O serviço de consulta de arquivos não foi encontrado.'
  }

  if (status === 429) {
    return 'Muitas consultas foram realizadas. Aguarde um momento e tente novamente.'
  }

  if (status >= 500) {
    return 'O servidor não conseguiu concluir a operação. Tente novamente mais tarde.'
  }

  if (status >= 400 && status < 500) {
    const dados = await obterCorpoErro(erro)

    const mensagem =
      typeof dados?.mensagem === 'string'
        ? dados.mensagem.trim()
        : typeof dados?.message === 'string'
          ? dados.message.trim()
          : ''

    return mensagem || padrao
  }

  if (
    !erro?.isAxiosError &&
    typeof erro?.message === 'string' &&
    erro.message.trim()
  ) {
    return erro.message.trim()
  }

  return padrao
}

export async function executarOperacaoArquivo(
  operacao,
  contexto,
) {
  try {
    return await operacao()
  } catch (erro) {
    if (consultaArquivoCancelada(erro)) {
      throw erro
    }

    const mensagem = await mensagemErroArquivo(
      erro,
      contexto,
    )

    throw new Error(mensagem, {
      cause: erro,
    })
  }
}
