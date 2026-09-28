import api from "./api"
export async function processarArquivo(arquivoId) {
  const { data } = await api.post(
    `/api/arquivos/${arquivoId}/processar`,
  )
  return data
}
