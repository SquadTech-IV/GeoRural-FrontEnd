import api from './api'
import { requisitar } from './requisicao'

export const ORDENACOES = [
  { valor: 'PIOR_PRIMEIRO', rotulo: 'Pior primeiro' },
  { valor: 'MELHOR_PRIMEIRO', rotulo: 'Melhor primeiro' },
  { valor: 'NOME', rotulo: 'Nome (A–Z)' },
  { valor: 'MAIS_IMOVEIS', rotulo: 'Mais imóveis' },
  { valor: 'MENOS_CONFORMES', rotulo: 'Menos conformes' },
]

export const QUANTIDADES_FAIXAS = [3, 5, 7]

export const QTD_FAIXAS_PADRAO = 5

export const ehPercentual = (indicador) => indicador?.unidade === '%'

const numero = (v) => (v === null || v === undefined ? null : Number(v))

function rotuloDaVersao(v) {
  const partes = [`#${v.numero}`, v.conjuntoNome, v.competencia].filter(Boolean)
  return partes.join(' · ') + (v.situacao === 'VIGENTE' ? ' (vigente)' : '')
}

function montarVersoes(versoes, sigla) {
  return versoes
    .filter((v) => v.situacao !== 'RASCUNHO')
    .filter((v) => v.indicadores.some((i) => i.sigla === sigla))
    .sort((a, b) => b.numero - a.numero)
    .map((v) => ({ id: v.versaoId, rotulo: rotuloDaVersao(v) }))
}
function montarPior(resposta, linhas) {
  const resumo = resposta.resumo
  if (!resumo || resumo.minimo === null || resumo.maximo === null) return { valor: null, municipio: null }

  const valor = resposta.indicador.sentido === 'MAIOR_MELHOR' ? numero(resumo.minimo) : numero(resumo.maximo)
  const municipio = linhas.find((l) => l.temDados && Math.abs(l.valor - valor) < 1e-9)

  return { valor, municipio: municipio?.nome ?? null }
}

function montarFaixas(resposta) {
  return {
    lista: resposta.faixas.map((f) => ({
      ordem: f.ordem,
      rotulo: f.rotulo,
      qtd: f.quantidade,
      pos: f.posicaoNaQualidade,
    })),
    min: numero(resposta.escala?.minimo),
    max: numero(resposta.escala?.maximo),
    origem: resposta.escala?.origem ?? null,
    estrategia: resposta.escala?.estrategia ?? 'INTERVALO',
  }
}

function montarLinhas(municipios, faixas) {
  const posicaoDaFaixa = new Map(faixas.lista.map((f) => [f.ordem, f.pos]))

  return municipios.map((m) => ({
    municipioId: m.municipioId,
    ibge: m.codigoIbge,
    nome: m.nome,
    uf: m.uf,
    areaHa: numero(m.areaHa),
    temDados: m.temDados,
    valor: numero(m.valorAgregado),
    imoveis: numero(m.imoveis),
    conformes: numero(m.conformes),
    pctConf: numero(m.percentualConformes),
    ha: numero(m.somaHectares),
    faixa: m.faixa,
    faixaRotulo: m.faixaRotulo,
    posicao: m.posicao,
    pos: posicaoDaFaixa.get(m.faixa) ?? null,
  }))
}

export function filtrarMunicipios(linhas, busca) {
  const termo = busca.trim().toLowerCase()
  if (!termo) return linhas

  return linhas.filter((l) =>
    String(l.nome || '').toLowerCase().includes(termo) || String(l.ibge || '').includes(termo)
  )
}

export function rotaDoMapa({ sigla, versaoId, municipio }) {
  return {
    path: '/mapa-indicadores',
    query: {
      indicador: sigla,
      versaoId: versaoId || undefined,
      ibge: municipio.ibge,
    },
  }
}

export const comparacaoMunicipiosService = {

  async carregarIndicadores() {
    const lista = await requisitar(async () => (await api.get('/api/indicadores')).data)
    return lista.map((i) => ({ sigla: i.sigla, nome: i.nome, unidade: i.unidade }))
  },

  async carregarVersoes(sigla) {
    const versoes = await requisitar(async () => (await api.get('/api/versoes')).data)
    return montarVersoes(versoes, sigla)
  },


  async consultar({ sigla, versaoId, ordenacao, qtdFaixas }) {
    const resposta = await requisitar(async () => {
      const { data } = await api.get(`/api/indicadores/${encodeURIComponent(sigla)}/municipios`, {
        params: { versaoId: versaoId || undefined, ordenacao, qtdFaixas },
        timeout: 60000,
      })
      return data
    })

    const faixasInfo = montarFaixas(resposta)
    const linhas = montarLinhas(resposta.municipios, faixasInfo)
    const pior = montarPior(resposta, linhas)

    return {
      indicador: resposta.indicador,
      resumo: {
        totalMunicipios: resposta.totalMunicipios,
        comDados: resposta.municipiosComDados,
        semDados: resposta.municipiosSemDados,
        piorValor: pior.valor,
        piorMunicipio: pior.municipio,
        mediana: numero(resposta.resumo?.mediana),
      },
      faixasInfo,
      linhas,
      avisos: resposta.avisos ?? [],
    }
  },
}
