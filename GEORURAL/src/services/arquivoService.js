import api from './api'

function validarId(valor) {
  const id = String(valor ?? '').trim()

  if (
    !/^[1-9]\d*$/.test(id) ||
    (
      typeof valor === 'number' &&
      !Number.isSafeInteger(valor)
    )
  ) {
    throw new Error('Informe um identificador válido.')
  }

  return id
}

export function prepararArquivosUpload(arquivos) {
  const lista = Array.from(arquivos ?? [])

  if (!lista.length) {
    throw new Error('Selecione pelo menos um arquivo.')
  }

  for (const arquivo of lista) {
    if (!(arquivo instanceof File) || !arquivo.size) {
      throw new Error(
        'Selecione arquivos que não estejam vazios.',
      )
    }

    if (!/\.(zip|gpkg|geojson)$/i.test(arquivo.name)) {
      throw new Error(
        `Formato não aceito: ${arquivo.name}. Envie .zip, .gpkg ou .geojson.`,
      )
    }
  }

  return lista
}

export const arquivoService = {
  async listar(nome, situacao, { signal } = {}) {
    const params = {}

    if (nome) params.nome = nome
    if (situacao) params.situacao = situacao

    const { data } = await api.get('/api/arquivos', {
      params,
      signal,
    })

    return data
  },

  async detalhe(id, { signal } = {}) {
    const { data } = await api.get(
      `/api/arquivos/${validarId(id)}`,
      { signal },
    )

    return data
  },

  // Recebimento na zona bruta: um arquivo por requisição.
  async enviar(arquivos, { conId, usuId, signal } = {}) {
    const conjuntoId = validarId(conId)
    const usuarioId = validarId(usuId)

    const itens =
      arquivos instanceof Blob
        ? [arquivos]
        : Array.from(arquivos ?? [])

    if (
      !itens.length ||
      itens.some(
        arquivo =>
          !(arquivo instanceof Blob) ||
          !arquivo.size,
      )
    ) {
      throw new Error(
        'Selecione arquivos que não estejam vazios.',
      )
    }

    const resultados = []

    for (const arquivo of itens) {
      const formData = new FormData()

      formData.append('arquivo', arquivo)
      formData.append('conId', conjuntoId)
      formData.append('usuId', usuarioId)

      const { data } = await api.post(
        '/api/arquivos/brutos/upload',
        formData,
        {
          signal,
          timeout: 60000,
        },
      )

      resultados.push(data)
    }

    return resultados
  },

  async baixarOriginal(id, { signal } = {}) {
    const { data } = await api.get(
      `/api/arquivos/${validarId(id)}/download`,
      {
        signal,
        responseType: 'blob',
        timeout: 60000,
      },
    )

    return data
  },

  async enviarIngestao(
    arquivos,
    conjuntoId,
    { signal } = {},
  ) {
    const id = validarId(conjuntoId)
    const itens = prepararArquivosUpload(arquivos)
    const formData = new FormData()

    formData.append('conjuntoId', id)

    for (const arquivo of itens) {
      formData.append('files', arquivo)
    }

    const { data } = await api.post(
      '/api/ingestao/upload',
      formData,
      {
        signal,
        timeout: 60000,
      },
    )

    return data
  },

  async processar(id, { signal } = {}) {
    const { data } = await api.post(
      `/api/arquivos/${validarId(id)}/processar`,
      undefined,
      { signal },
    )

    return data
  },
}