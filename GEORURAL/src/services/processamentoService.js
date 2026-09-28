import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8080',
  timeout: 0, // pipeline é síncrona; shapefile grande pode demorar
})

export async function processarArquivo(arquivoId) {
  // TROCAR pela rota real do controller
  const { data } = await api.post(`/api/ROTA-DE-PROCESSAMENTO/${arquivoId}`)
  return data
}
