import { readonly, ref } from 'vue'

const contextos = {
  conferencia: {
    titulo: 'Conferência dos resultados',
    mensagem:
      'Não foi possível consultar os resultados da validação.',
  },
  publicacao: {
    titulo: 'Publicação da versão',
    mensagem:
      'Não foi possível concluir a solicitação de publicação.',
  },
  versoes: {
    titulo: 'Versões publicadas',
    mensagem:
      'Não foi possível consultar as versões publicadas.',
  },
}

export function requisicaoPublicacaoCancelada(erro) {
  return (
    erro?.code === 'ERR_CANCELED' ||
    erro?.name === 'CanceledError' ||
    erro?.name === 'AbortError'
  )
}

export function mensagemErroPublicacao(
  erro,
  contexto = 'conferencia',
) {
  const configuracao =
    contextos[contexto] || contextos.conferencia

  if (typeof erro === 'string') {
    return erro.trim() || configuracao.mensagem
  }

  const status = erro?.response?.status

  const tempoEsgotado =
    erro?.code === 'ECONNABORTED' ||
    erro?.code === 'ETIMEDOUT' ||
    status === 408 ||
    status === 504

  if (tempoEsgotado) {
    return contexto === 'publicacao'
      ? 'O tempo de resposta terminou. Consulte a situação da versão antes de solicitar a operação novamente.'
      : 'O servidor demorou para responder. Tente novamente.'
  }

  if (erro?.isAxiosError && !erro.response) {
    return contexto === 'publicacao'
      ? 'A conexão foi interrompida. A operação pode ter sido recebida pelo servidor. Consulte a situação da versão antes de reenviar.'
      : 'Não foi possível acessar o servidor. Verifique a conexão e tente novamente.'
  }

  if (status === 401) {
    return 'Sua sessão não está autorizada. Entre novamente no sistema.'
  }

  if (status === 403) {
    return 'Você não possui permissão para executar esta operação.'
  }

  if (status === 404) {
    return 'O recurso ou o serviço solicitado não foi encontrado.'
  }

  if (status === 429) {
    return 'Muitas solicitações foram realizadas. Aguarde um momento e tente novamente.'
  }

  if (status >= 500) {
    return contexto === 'publicacao'
      ? 'O servidor não confirmou a operação. Consulte a situação da versão antes de tentar novamente.'
      : 'O servidor não conseguiu concluir a consulta. Tente novamente mais tarde.'
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

  if (status === 409) {
    return 'A versão foi alterada ou não está disponível para esta operação. Atualize os dados antes de continuar.'
  }

  if (
    !erro?.isAxiosError &&
    typeof erro?.message === 'string' &&
    erro.message.trim()
  ) {
    return erro.message.trim()
  }

  return configuracao.mensagem
}

export function criarFeedbackPublicacao() {
  const notificacoes = ref([])

  let sequencia = 0

  function removerContexto(contexto) {
    notificacoes.value = notificacoes.value.filter(
      item => item.contexto !== contexto,
    )
  }

  function notificar(tipo, titulo, mensagem) {
    notificacoes.value = [
      ...notificacoes.value,
      {
        id: ++sequencia,
        tipo,
        titulo,
        mensagem,
      },
    ]
  }

  function registrarErro(contexto, erro) {
    removerContexto(contexto)

    if (!erro || requisicaoPublicacaoCancelada(erro)) {
      return
    }

    const configuracao =
      contextos[contexto] || contextos.conferencia

    notificacoes.value = [
      ...notificacoes.value,
      {
        id: ++sequencia,
        contexto,
        tipo: 'erro',
        titulo: configuracao.titulo,
        mensagem: mensagemErroPublicacao(
          erro,
          contexto,
        ),
      },
    ]
  }

  function fechar(id) {
    notificacoes.value = notificacoes.value.filter(
      item => item.id !== id,
    )
  }

  return {
    notificacoes: readonly(notificacoes),
    registrarErro,
    notificar,
    fechar,
  }
}
