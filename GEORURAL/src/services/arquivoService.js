import api from './api'
import { validarId } from './cadastroService'

export function prepararArquivosUpload(arquivos) {
  const lista = Array.from(arquivos ?? [])
  if (!lista.length) throw new Error('Selecione pelo menos um arquivo.')
  for (const arquivo of lista) {
    if (!(arquivo instanceof File) || !arquivo.size) throw new Error('Selecione arquivos que não estejam vazios.')
    if (!/\.(zip|gpkg|geojson)$/i.test(arquivo.name)) {
      throw new Error(`Formato não aceito: ${arquivo.name}. Envie .zip, .gpkg ou .geojson.`)
    }
  }
  return lista
}

export const arquivoService = {
  async listar(nome, situacao) {
    const params = {}

    if (nome) params.nome = nome
    if (situacao) params.situacao = situacao

    const { data } = await api.get('/api/arquivos', {
      params,
    })

    return data
  },

  async detalhe(id) {
    const { data } = await api.get(
      `/api/arquivos/${validarId(id)}`,
    )

    return data
  },

  async enviar(arquivos, conjuntoId) {
    const id = validarId(conjuntoId)
    const formData = new FormData()

    formData.append('conjuntoId', String(id))

    prepararArquivosUpload(arquivos).forEach((arquivo) => {
      formData.append('files', arquivo)
    })

    const { data } = await api.post(
      '/api/ingestao/upload',
      formData,
    )

    return data
  },

  async processar(id) {
    const { data } = await api.post(
      `/api/arquivos/${validarId(id)}/processar`,
    )

    return data
  },
}
