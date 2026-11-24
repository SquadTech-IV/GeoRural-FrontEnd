import api from './api'
import { apresentarSituacao } from '../utils/situacoesIndicador'

export function consultaIndicadoresCancelada(erro) {
  return erro?.code === 'ERR_CANCELED' || erro?.name === 'AbortError'
}
export function mensagemErroConsultaIndicadores(erro) {
  const status = erro?.response?.status
  if (status === 401) return 'Entre com uma conta autorizada para consultar os indicadores.'
  if (status === 403) return 'Seu perfil não possui permissão para esta consulta.'
  if (erro?.code === 'ECONNABORTED' || status === 504)
    return 'A consulta demorou demais. Tente novamente.'
  if (erro?.isAxiosError && !erro.response)
    return 'Não foi possível acessar o backend. Verifique a conexão.'
  if (status === 404) return 'O indicador ou o serviço de consulta não foi encontrado.'
  if (status >= 500) return 'O servidor não conseguiu consultar os indicadores.'
  return (
    erro?.response?.data?.mensagem ||
    erro?.response?.data?.message ||
    erro?.message ||
    'Não foi possível realizar a consulta.'
  )
}
function id(valor) {
  if (
    !/^[1-9]\d*$/.test(String(valor ?? '')) ||
    (typeof valor === 'number' && !Number.isSafeInteger(valor))
  )
    throw new Error('Identificador de consulta inválido.')
  return String(valor)
}
function numero(valor) {
  if (valor == null || valor === '') return null
  const n = Number(valor)
  if (!Number.isFinite(n)) throw new Error('O backend retornou um valor numérico inválido.')
  return n
}
export function formatarValorConsulta(valor, unidade = '') {
  const n = numero(valor)
  return n == null
    ? 'Não informado'
    : n.toLocaleString('pt-BR', { maximumFractionDigits: 3 }) +
        (unidade === '%' ? '%' : unidade ? ` ${unidade}` : '')
}
// rotulo e cor vem do mapa compartilhado: a lista que estava aqui so conhecia
// IRL, IAE e ISAP, e ICV, IDESMAT e IFC apareciam cinza com o codigo cru na tela
export function apresentarSituacaoConsulta(situacao) {
  return apresentarSituacao(situacao)
}
export function normalizarResultadoConsulta(dado) {
  if (!dado || typeof dado.codigoCar !== 'string' || !dado.codigoCar.trim() || !dado.indicador)
    throw new Error('Resultado de indicador inválido.')
  const percentual = numero(dado.percentual),
    absoluto = numero(dado.absoluto),
    hectares = numero(dado.hectares)
  const valor = percentual ?? absoluto ?? hectares
  const unidade =
    percentual != null
      ? '%'
      : absoluto != null
        ? dado.unidade
        : hectares != null
          ? 'ha'
          : dado.unidade
  return {
    ...dado,
    id: id(dado.id),
    car: dado.codigoCar,
    nome: dado.nomeImovel,
    rotulo: dado.nomeImovel || `CAR ${dado.codigoCar}`,
    versao: dado.versaoNumero ?? dado.versaoId,
    municipio: dado.municipio || 'Não informado',
    valor,
    valorTexto: formatarValorConsulta(valor, unidade),
    hectaresTexto: formatarValorConsulta(hectares, 'ha'),
    situacaoApresentada: apresentarSituacaoConsulta(dado.situacao),
    mapa: { name: 'MapaIndicadores', params: { car: dado.codigoCar } },
  }
}
export function prepararFiltrosConsulta({ indicador, versao = '', municipio = '', busca = '' }) {
  const sigla = String(indicador ?? '')
    .trim()
    .toUpperCase()
  if (!sigla || !/^[A-Z0-9_]+$/.test(sigla)) throw new Error('Selecione um indicador válido.')
  return {
    indicador: sigla,
    ...(versao ? { versaoId: id(versao) } : { vigente: true }),
    municipio: municipio.trim() || undefined,
    codigoCar: busca.trim() || undefined,
  }
}
export function prepararOpcoesVersoes(versoes, sigla) {
  return versoes
    .filter((v) => v.indicadores?.some((i) => i.sigla?.toUpperCase() === sigla?.toUpperCase()))
    .map((v) => ({
      id: id(v.versaoId),
      rotulo: `#${v.numero} · ${v.conjuntoNome || 'Conjunto'} · ${v.situacao}${v.competencia ? ` · ${v.competencia}` : ''}`,
    }))
}
export function normalizarSeriesConsulta(data) {
  if (
    !data ||
    !Array.isArray(data.composicao) ||
    !Array.isArray(data.histograma) ||
    !Number.isSafeInteger(data.resultados) ||
    data.resultados < 0 ||
    !Number.isSafeInteger(data.imoveis) ||
    data.imoveis < 0
  )
    throw new Error('O backend retornou séries de indicadores inválidas.')
  const cores = ['#8520bd', '#0891b2', '#16a34a', '#ea580c', '#db2777', '#64748b']
  return {
    ...data,
    composicao: data.composicao.map((s, indice) => {
      if (!Number.isSafeInteger(s.quantidade) || s.quantidade < 0)
        throw new Error('Contagem por situação inválida.')
      const percentual = numero(s.percentualDoTotal)
      if (percentual == null || percentual < 0 || percentual > 100)
        throw new Error('Percentual de composição inválido.')
      return {
        situacao: s.situacao,
        rotulo: apresentarSituacaoConsulta(s.situacao).texto,
        quantidade: s.quantidade,
        percentual,
        cor: cores[indice % cores.length],
      }
    }),
    faixas: data.histograma.map((b) => b.rotulo),
    valores: data.histograma.map((b) => {
      if (!Number.isSafeInteger(b.quantidade) || b.quantidade < 0)
        throw new Error('Histograma inválido.')
      return b.quantidade
    }),
    avisos: Array.isArray(data.avisos) ? data.avisos : [],
    titulo: `Distribuição · ${data.indicadorNome || data.indicador}${data.unidade ? ` (${data.unidade})` : ''}`,
  }
}
export function criarConsultaIndicadoresService(cliente = api) {
  return {
    async catalogo({ signal } = {}) {
      const { data } = await cliente.get('/api/v1/indicadores', { signal })
      if (!Array.isArray(data)) throw new Error('Catálogo de indicadores inválido.')
      return data.map((i) => ({
        ...i,
        sigla: String(i.sigla).toUpperCase(),
        rotulo: `${i.sigla} — ${i.nome}`,
      }))
    },
    async versoes({ signal } = {}) {
      const { data } = await cliente.get('/api/versoes', { signal })
      if (!Array.isArray(data)) throw new Error('Lista de versões inválida.')
      return data
    },
    async resultados(filtros, pagina = 1, { signal } = {}) {
      if (!Number.isSafeInteger(pagina) || pagina < 1) throw new Error('Página inválida.')
      const { data } = await cliente.get('/api/v1/indicadores/resultados', {
        signal,
        params: {
          ...prepararFiltrosConsulta(filtros),
          pagina: pagina - 1,
          tamanho: 20,
          ordenar: 'imovel',
          incluirDetalhes: true,
        },
      })
      if (
        !data ||
        !Array.isArray(data.itens) ||
        data.pagina !== pagina - 1 ||
        !Number.isSafeInteger(data.totalItens) ||
        data.totalItens < 0 ||
        !Number.isSafeInteger(data.totalPaginas) ||
        data.totalPaginas < 0 ||
        !Number.isSafeInteger(data.tamanho) ||
        data.tamanho < 1 ||
        data.itens.length > data.tamanho ||
        data.itens.length > data.totalItens
      )
        throw new Error('Página de resultados inválida.')
      return {
        itens: data.itens.map(normalizarResultadoConsulta),
        total: data.totalItens,
        totalPaginas: data.totalPaginas,
      }
    },
    async series(filtros, { signal } = {}) {
      const params = prepararFiltrosConsulta(filtros)
      const { data } = await cliente.get('/api/indicadores/series', { signal, params })
      if (data?.indicador?.toUpperCase() !== params.indicador)
        throw new Error('O backend retornou séries de outro indicador.')
      return normalizarSeriesConsulta(data)
    },
  }
}
export const consultaIndicadoresService = criarConsultaIndicadoresService()
