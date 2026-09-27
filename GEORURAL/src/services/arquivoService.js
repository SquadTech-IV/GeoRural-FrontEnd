import api from './api'

export const arquivoService = {

  listar: async (nome, situacao) => {
    const params = {}
    if (nome) params.nome = nome
    if (situacao) params.situacao = situacao

    const response = await api.get('/api/arquivos', { params })
    return response.data
  },


  detalhe: async (id) => {
    const response = await api.get(`/api/arquivos/${id}`)
    return response.data
  },


  baixar: async (id) => {
    const response = await api.get(`/api/arquivos/${id}/download`, {
      responseType: 'blob',
    })
    return response
  },


  subirConteudo: async (id, arquivo) => {
    const formData = new FormData()
    formData.append('arquivo', arquivo)

    const response = await api.post(`/api/arquivos/${id}/conteudo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  processar: async (id) => {
    const response = await api.post(`/api/arquivos/${id}/processar`)
    return response.data
  },
}
