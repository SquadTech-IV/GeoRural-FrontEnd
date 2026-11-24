import api from './api'

// o back limita tamanho a 1000 (TAMANHO_MAXIMO no ImovelListaService)
export const TAMANHOS_DE_PAGINA = [50, 100, 200, 500]
const TAMANHO_PADRAO = 100

export function requisicaoImovelCancelada(erro) {
  return (
    erro?.code === 'ERR_CANCELED' || erro?.name === 'CanceledError' || erro?.name === 'AbortError'
  )
}

// nao manda parametro vazio: o axios omite undefined, e o back trata null/blank
function filtros({ municipio, busca } = {}) {
  return {
    municipio: municipio?.trim() || undefined,
    busca: busca?.trim() || undefined,
  }
}

export const imovelService = {
  // Antes isto chamava /api/imoveis sem nenhum parametro. O back tem
  // tamanho com default 200, entao a tela mostrava os 200 primeiros imoveis
  // sempre, sem paginar e sem avisar que havia mais.
  async listar({ municipio, busca, pagina = 0, tamanho = TAMANHO_PADRAO, signal } = {}) {
    const { data } = await api.get('/api/imoveis', {
      params: { ...filtros({ municipio, busca }), pagina, tamanho },
      signal,
    })
    return Array.isArray(data) ? data : []
  },

  // quantos existem com o mesmo filtro, para a tela saber o tamanho real
  async total({ municipio, busca, signal } = {}) {
    const { data } = await api.get('/api/imoveis/total', {
      params: filtros({ municipio, busca }),
      signal,
    })
    return Number(data?.total ?? 0)
  },

  // IAE do imovel: percentual, hectares, data do calculo e a pegada dos embargos
  // que cruzam a area (geometria unida; nao traz codigo nem data de cada embargo)
  async detalheIae(car, { signal } = {}) {
    const { data } = await api.get(`/api/imoveis/${encodeURIComponent(car)}/iae`, { signal })
    return data
  },
}

export default imovelService