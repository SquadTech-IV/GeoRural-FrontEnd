import api from './api'

export const arquivoService = {
  async listar(nome, situacao) {
    const params = {}

    if (nome) params.nome = nome
    if (situacao) params.situacao = situacao

    const response = await api.get('/api/arquivos', { params })
    return response.data
  },

  async detalhe(id) {
    const response = await api.get(`/api/arquivos/${id}`)
    return response.data
  },

  async enviar(arquivos) {
    const formData = new FormData()

    Array.from(arquivos).forEach((arquivo) => {
      formData.append('files', arquivo)
    })

    const response = await api.post('/api/ingestao/upload', formData)
    return response.data
  },

  async processar(id) {
    const response = await api.post(`/api/arquivos/${id}/processar`)
    return response.data
  },
}
