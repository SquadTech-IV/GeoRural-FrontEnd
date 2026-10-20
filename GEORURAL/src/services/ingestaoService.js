import api from './api'

export function validarConjuntoIngestao(conjuntoId) {
  const id = String(conjuntoId ?? '').trim()

  if (!/^[1-9]\d*$/.test(id)) {
    throw new Error('Selecione um conjunto válido.')
  }

  return id
}

export function consultaIngestaoCancelada(erro) {
  return (
    erro?.code === 'ERR_CANCELED' ||
    erro?.name === 'CanceledError' ||
    erro?.name === 'AbortError'
  )
}

export function mensagemErroIngestao(erro) {
  const status = erro?.response?.status

  if (status === 401 || status === 403) {
    return 'A consulta não foi autorizada. Verifique sua sessão e a configuração de acesso à API.'
  }

  if (status === 404) {
    return 'O conjunto ou a rota de consulta não foi encontrado.'
  }

  if (status === 408 || status === 504) {
    return 'A consulta demorou mais que o permitido. Tente novamente.'
  }

  if (
    erro?.code === 'ECONNABORTED' ||
    erro?.code === 'ETIMEDOUT'
  ) {
    return 'A consulta demorou mais que o permitido. Tente novamente.'
  }

  if (erro?.isAxiosError && !erro.response) {
    return 'Não foi possível acessar o backend. Verifique a conexão e tente novamente.'
  }

  const dados = erro?.response?.data

  const mensagem =
    typeof dados?.mensagem === 'string'
      ? dados.mensagem
      : typeof dados?.message === 'string'
        ? dados.message
        : ''

  if (
    status >= 400 &&
    status < 500 &&
    mensagem.trim()
  ) {
    return mensagem.trim()
  }

  if (status >= 500) {
    return 'O backend não conseguiu concluir a consulta à API. Tente novamente.'
  }

  if (!erro?.isAxiosError && erro?.message) {
    return erro.message
  }

  return 'Não foi possível consultar a API.'
}

async function executarConsulta(caminho, { signal } = {}) {
  try {
    const { data } = await api.get(caminho, {
      signal,
      timeout: 30000,
    })

    if (data === null || data === undefined || data === '') {
      throw new Error(
        'O backend retornou uma resposta vazia para a consulta.',
      )
    }

    return data
  } catch (erro) {
    if (consultaIngestaoCancelada(erro)) {
      throw erro
    }

    throw new Error(mensagemErroIngestao(erro), {
      cause: erro,
    })
  }
}

export const ingestaoService = {
  listarFontesApi(opcoes = {}) {
    return executarConsulta(
      '/api/ingestao/fontes',
      opcoes,
    )
  },

  async consultarDisponiveis(conjuntoId, opcoes = {}) {
    const id = validarConjuntoIngestao(conjuntoId)

    return executarConsulta(
      `/api/ingestao/conjuntos/${id}/disponiveis`,
      opcoes,
    )
  },
}
