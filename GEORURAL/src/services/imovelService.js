import api from './api'

export const imovelService = {
  async listar() {
    const { data } = await api.get('/api/imoveis')
    return data
  },

  async detalhe(car) {
    const { data } = await api.get(
      `/api/imoveis/${encodeURIComponent(car)}/iae`,
    )
    return data
  },
}
