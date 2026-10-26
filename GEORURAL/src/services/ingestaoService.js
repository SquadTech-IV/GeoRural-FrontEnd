import api from './api'

export function validarConjuntoIngestao(valor) {
  const id = String(valor ?? '').trim()

  if (
    !/^[1-9]\d*$/.test(id) ||
    (
      typeof valor === 'number' &&
      !Number.isSafeInteger(valor)
    )
  ) {
    throw new Error('Selecione um conjunto válido.')
  }

  return id
}

export function consultaIngestaoCancelada(erro) {
  return (
    erro?.code === 'ERR_CANCELED' ||
    ['CanceledError', 'AbortError'].includes(erro?.name)
  )
}

export function mensagemErroIngestao(erro, envio = false) {
  if (typeof erro === 'string') {
    return erro.trim() || 'Não foi possível concluir a operação.'
  }

  const status = erro?.response?.status

  if (
    ['ECONNABORTED', 'ETIMEDOUT'].includes(erro?.code) ||
    status === 408 ||
    status === 504
  ) {
    return envio
      ? 'O tempo de resposta terminou. Confira os arquivos recebidos antes de reenviar.'
      : 'A consulta demorou mais que o permitido. Tente novamente.'
  }

  if (erro?.isAxiosError && !erro.response) {
    return envio
      ? 'A conexão foi interrompida. Confira o recebimento antes de reenviar.'
      : 'Não foi possível conectar ao backend.'
  }

  if (status === 401 || status === 403) {
    return 'Você não possui autorização para esta operação.'
  }

  if (status === 413) {
    return 'O arquivo excede o tamanho permitido pelo servidor.'
  }

  const dados = erro?.response?.data
  const mensagem = dados?.mensagem ?? dados?.message

  if (
    status >= 400 &&
    status < 500 &&
    typeof mensagem === 'string' &&
    mensagem.trim()
  ) {
    return mensagem.trim()
  }

  if (status === 404) {
    return 'O conjunto ou o serviço solicitado não foi encontrado.'
  }

  if (status >= 500) {
    return envio
      ? 'O servidor falhou. Confira o recebimento antes de reenviar.'
      : 'O servidor não conseguiu concluir a consulta.'
  }

  return erro?.message || 'Não foi possível concluir a operação.'
}

async function executar(operacao, envio = false) {
  try {
    return await operacao()
  } catch (erro) {
    if (consultaIngestaoCancelada(erro)) throw erro

    throw new Error(mensagemErroIngestao(erro, envio), {
      cause: erro,
    })
  }
}

export const ingestaoService = {
  listarFontesApi({ signal } = {}) {
    return executar(async () => {
      const { data } = await api.get(
        '/api/ingestao/fontes',
        { signal },
      )

      if (!Array.isArray(data)) {
        throw new Error('A API retornou uma lista de fontes inválida.')
      }

      return data
    })
  },

  consultarDisponiveis(conjuntoId, { signal } = {}) {
    return executar(async () => {
      const id = validarConjuntoIngestao(conjuntoId)

      const { data } = await api.get(
        `/api/ingestao/conjuntos/${id}/disponiveis`,
        { signal },
      )

      if (
        !Array.isArray(data) ||
        data.some(item =>
          !item ||
          typeof item.identificador !== 'string' ||
          !item.identificador.trim() ||
          typeof item.jaRecebido !== 'boolean',
        )
      ) {
        throw new Error('A API retornou itens disponíveis inválidos.')
      }

      const ids = data.map(item => item.identificador)

      if (new Set(ids).size !== ids.length) {
        throw new Error('A API retornou identificadores repetidos.')
      }

      return data
    })
  },

  enviarUpload(conjuntoId, arquivo) {
    return executar(async () => {
      const id = validarConjuntoIngestao(conjuntoId)

      if (!(arquivo instanceof File) || arquivo.size === 0) {
        throw new Error('Selecione um arquivo que não esteja vazio.')
      }

      if (
        !/\.(zip|shp|gpkg|geojson|json|csv|tif|tiff)$/i.test(
          arquivo.name,
        )
      ) {
        throw new Error('O formato selecionado não é aceito pelo backend.')
      }

      const corpo = new FormData()
      corpo.append('conjuntoId', id)
      corpo.append('files', arquivo)

      const { data } = await api.post(
        '/api/ingestao/upload',
        corpo,
        { timeout: 120000 },
      )

      if (
        !Array.isArray(data) ||
        data.length !== 1 ||
        data.some(item =>
          !item ||
          typeof item.aceito !== 'boolean' ||
          String(item.conjuntoId) !== id ||
          (item.aceito && item.arquivoId == null),
        )
      ) {
        throw new Error(
          'Confirmação de upload inválida. Confira o recebimento antes de reenviar.',
        )
      }

      return data
    }, true)
  },

  importar(conjuntoId, identificadores) {
    return executar(async () => {
      const id = validarConjuntoIngestao(conjuntoId)

      if (
        !Array.isArray(identificadores) ||
        !identificadores.length ||
        identificadores.some(item =>
          typeof item !== 'string' || !item.trim(),
        )
      ) {
        throw new Error('Selecione pelo menos um item válido para importar.')
      }

      const ids = [
        ...new Set(identificadores.map(item => item.trim())),
      ]

      const { data } = await api.post(
        `/api/ingestao/conjuntos/${id}/importar`,
        { identificadores: ids },
        { timeout: 120000 },
      )

      if (
        !data ||
        !Array.isArray(data.itens) ||
        ![
          data.total,
          data.importados,
          data.jaRecebidos,
          data.falhas,
        ].every(item => Number.isSafeInteger(item) && item >= 0) ||
        data.total !== ids.length ||
        data.total !== data.itens.length ||
        data.importados + data.jaRecebidos + data.falhas !== data.total ||
        data.itens.some(item =>
          !item ||
          !ids.includes(item.identificador) ||
          !['SUCESSO', 'JA_RECEBIDO', 'FALHA'].includes(item.status),
        ) ||
        new Set(data.itens.map(item => item.identificador)).size !== ids.length
      ) {
        throw new Error(
          'Confirmação de importação inválida. Confira o recebimento antes de reenviar.',
        )
      }

      return data
    }, true)
  },

  listarRecentes(conjuntoId, { signal } = {}) {
    return executar(async () => {
      const id = validarConjuntoIngestao(conjuntoId)

      const { data } = await api.get(
        `/api/ingestao/conjuntos/${id}/recentes`,
        { signal },
      )

      if (!Array.isArray(data)) {
        throw new Error('A API retornou uma lista de ingestões inválida.')
      }

      return data
    })
  },
}
