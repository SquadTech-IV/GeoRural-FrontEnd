import api from './api'
import { validarIdPublicacao } from './publicacaoService'

export const formatosExportacao = [
  { id: 'CSV', descricao: 'Dados tabulares', tipo: 'text/csv' },
  { id: 'JSON', descricao: 'Dados estruturados', tipo: 'application/json' },
  {
    id: 'GEOJSON',
    rotulo: 'GeoJSON',
    descricao: 'Dados geoespaciais',
    tipo: 'application/geo+json',
  },
]

export function nomePrevisto(versao, formato) {
  return `georural_v${versao.numero ?? versao.id}_${versao.competencia ?? 'sem-competencia'}_todos.${formato.id.toLowerCase()}`
}

export async function receberExportacao(versao, formato, { signal, aoReceber }) {
  const id = validarIdPublicacao(versao.id)
  let fluxo

  try {
    const resposta = await api.get(`/api/v1/versoes/${id}/resultados/download`, {
      params: { formato: formato.id },
      adapter: 'fetch',
      responseType: 'stream',
      timeout: 0,
      signal,
    })
    fluxo = resposta.data
    const tipo = resposta.headers['content-type']
    if (resposta.status !== 200 || tipo?.split(';')[0].trim() !== formato.tipo || !fluxo) {
      throw new Error('O servidor não entregou um arquivo no formato solicitado.')
    }

    const nomeServidor = resposta.headers['content-disposition']?.match(/filename="([^"]+)"/i)?.[1]
    const nome = (nomeServidor || nomePrevisto(versao, formato)).replace(/[\\/]/g, '_')
    aoReceber(nome)

    const arquivo = await new Response(fluxo, { headers: { 'Content-Type': tipo } }).blob()
    if (!arquivo.size) throw new Error('O servidor entregou um arquivo vazio.')

    return { arquivo, nome }
  } catch (erro) {
    const corpo = fluxo ?? erro.response?.data
    if (corpo?.cancel && !corpo.locked) await corpo.cancel().catch(() => {})
    throw erro
  }
}
