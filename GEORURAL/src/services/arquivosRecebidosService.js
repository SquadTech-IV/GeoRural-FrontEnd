import api from './api'

function validarId(valor) {
  if (
    typeof valor === 'number' &&
    !Number.isSafeInteger(valor)
  ) {
    throw new Error('O identificador do arquivo é inválido.')
  }

  const id = String(valor ?? '').trim()

  if (!/^[1-9]\d*$/.test(id)) {
    throw new Error('Selecione um arquivo válido.')
  }

  return id
}

function validarObjeto(valor, mensagem) {
  if (
    !valor ||
    typeof valor !== 'object' ||
    Array.isArray(valor)
  ) {
    throw new Error(mensagem)
  }
}

function adaptarResumo(dado) {
  validarObjeto(
    dado,
    'O backend retornou um arquivo inválido.',
  )

  return {
    ...dado,
    id: validarId(dado.id),
  }
}

function adaptarDetalhe(dado) {
  const arquivo = adaptarResumo(dado)

  if (
    dado.arquivos != null &&
    !Array.isArray(dado.arquivos)
  ) {
    throw new Error(
      'O backend retornou uma lista de itens inválida.',
    )
  }

  return {
    ...arquivo,
    arquivos: (dado.arquivos ?? []).map(item => {
      validarObjeto(
        item,
        'O backend retornou um item de arquivo inválido.',
      )

      return {
        ...item,
        id: validarId(item.id),
      }
    }),
  }
}

export function consultaArquivoCancelada(erro) {
  return (
    erro?.code === 'ERR_CANCELED' ||
    erro?.name === 'CanceledError' ||
    erro?.name === 'AbortError'
  )
}

export function formatarDataRecebimento(valor) {
  if (!valor) return 'Não informado'

  const data = new Date(valor)

  if (Number.isNaN(data.getTime())) {
    return String(valor)
  }

  return data.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export function formatarTamanhoArquivo(valor) {
  if (valor == null || valor === '') {
    return 'Não informado'
  }

  const bytes = Number(valor)

  if (!Number.isFinite(bytes) || bytes < 0) {
    return 'Não informado'
  }

  const unidades = ['B', 'KB', 'MB', 'GB', 'TB']

  let tamanho = bytes
  let unidade = 0

  while (
    tamanho >= 1024 &&
    unidade < unidades.length - 1
  ) {
    tamanho /= 1024
    unidade++
  }

  const numero = tamanho.toLocaleString('pt-BR', {
    maximumFractionDigits: unidade === 0 ? 0 : 1,
  })

  return `${numero} ${unidades[unidade]}`
}

export const arquivosRecebidosService = {
  async listar({
    nome = '',
    situacao = '',
    signal,
  } = {}) {
    const params = {}

    const filtroNome = String(nome ?? '').trim()
    const filtroSituacao = String(situacao ?? '')
      .trim()
      .toUpperCase()

    if (filtroNome) {
      params.nome = filtroNome
    }

    if (filtroSituacao) {
      params.situacao = filtroSituacao
    }

    const { data } = await api.get('/api/arquivos', {
      params,
      signal,
      timeout: 30000,
    })

    if (!Array.isArray(data)) {
      throw new Error(
        'O backend retornou uma lista de arquivos inválida.',
      )
    }

    return data.map(adaptarResumo)
  },

  async consultarDetalhe(id, { signal } = {}) {
    const arquivoId = validarId(id)

    const { data } = await api.get(
      `/api/arquivos/${arquivoId}`,
      {
        signal,
        timeout: 30000,
      },
    )

    return adaptarDetalhe(data)
  },

  async baixarOriginal(id, { signal } = {}) {
    const arquivoId = validarId(id)

    const { data } = await api.get(
      `/api/arquivos/${arquivoId}/download`,
      {
        signal,
        responseType: 'blob',
        timeout: 60000,
      },
    )

    return data
  },
}
