import api from './api'
import { rotularSituacao, classeDaSituacao } from '../utils/situacoesIndicador'

// Uma chamada so, numa rota que existe.
//
// Antes este arquivo chamava /api/qualidade/indicadores e
// /api/qualidade/indicadores/versoes/{id}. Nenhuma das duas existe no back (toda a
// qualidade dele vive em /api/v1/qualidade/...), entao as duas davam 404 -- e a
// primeira nao tinha catch, de modo que o 404 derrubava o painel inteiro da tela
// em vez de degradar.
//
// GET /api/versoes/{id}/indicadores (VersaoIndicadorController) devolve mais do que
// as duas tentavam montar: a contagem por situacao desta versao e da que esta
// vigente, ja pronta para comparar.
const ROTA = (versaoId) => `/api/versoes/${versaoId}/indicadores`

// situacao que diz "nao deu para apurar", nao "apurou e esta ruim"
const INDISPONIVEL = 'CAMADA_INDISPONIVEL'

export function requisicaoIndicadoresCancelada(erro) {
  return (
    erro?.code === 'ERR_CANCELED' || erro?.name === 'CanceledError' || erro?.name === 'AbortError'
  )
}

export function mensagemErroIndicadores(erro) {
  if (requisicaoIndicadoresCancelada(erro)) return ''

  const status = erro?.response?.status
  if (status === 404) return 'Versão não encontrada para consultar os indicadores.'
  if (status === 401 || status === 403) {
    return 'Você não tem permissão para consultar os indicadores desta versão.'
  }
  if (erro?.isAxiosError && !erro.response) {
    return 'Não foi possível acessar o backend. Verifique a conexão e tente novamente.'
  }
  if (typeof status === 'number' && status >= 500) {
    return 'O servidor não conseguiu consultar os indicadores. Tente novamente mais tarde.'
  }

  const mensagemServidor =
    typeof erro?.response?.data?.mensagem === 'string'
      ? erro.response.data.mensagem.trim()
      : typeof erro?.response?.data?.message === 'string'
        ? erro.response.data.message.trim()
        : ''

  if (mensagemServidor) return mensagemServidor
  if (typeof erro?.message === 'string' && erro.message.trim()) return erro.message.trim()

  return 'Não foi possível consultar os indicadores desta versão.'
}

function numero(valor) {
  const n = Number(valor ?? 0)
  return Number.isFinite(n) ? n : 0
}

// Separa as situacoes do indicador em boa, ruim e indiferente usando a mesma
// classificacao do resto do front (utils/situacoesIndicador), que espelha o v_boa
// do agregar_municipio no PKG_CALCULO.
function somarPorVeredito(situacoes) {
  let bom = 0
  let ruim = 0
  let indisponivel = 0
  let bomAntes = 0
  let total = 0
  let totalAntes = 0

  for (const s of situacoes) {
    const codigo = String(s?.situacao ?? '').toUpperCase()
    const qtd = numero(s?.quantidade)
    const qtdAntes = numero(s?.quantidadeComparada)
    const classe = classeDaSituacao(codigo)

    total += qtd
    totalAntes += qtdAntes
    if (codigo === INDISPONIVEL) indisponivel += qtd
    if (classe === 'sucesso') {
      bom += qtd
      bomAntes += qtdAntes
    } else if (classe === 'erro') {
      ruim += qtd
    }
  }

  return { bom, ruim, indisponivel, bomAntes, total, totalAntes }
}

// O IAPP grava CALCULADO/SEM_APP/CAMADA_INDISPONIVEL, que sao estados da apuracao e
// nao veredito: nao existe conforme nem nao conforme para contar. Nesses casos o
// bloco passa a mostrar cobertura de apuracao, com rotulo proprio, em vez de pintar
// de vermelho um resultado que nao e ruim.
function montarBloco(ind) {
  const nome = ind?.nome || ind?.sigla || 'Indicador'
  const soma = somarPorVeredito(Array.isArray(ind?.situacoes) ? ind.situacoes : [])
  const calculados = numero(ind?.calculados) || soma.total
  const temVeredito = soma.bom + soma.ruim > 0

  const bom = temVeredito ? soma.bom : calculados - soma.indisponivel
  const ruim = temVeredito ? soma.ruim : soma.indisponivel
  const base = bom + ruim
  const pctBom = base > 0 ? Math.round((bom / base) * 100) : 0

  const antes = numero(ind?.calculadosComparados)
  const pctAntes = soma.totalAntes > 0 ? Math.round((soma.bomAntes / soma.totalAntes) * 100) : null

  return {
    titulo: nome,
    sigla: ind?.sigla ?? null,
    vazio: calculados === 0,
    total: calculados,
    pctBom,
    bom: {
      rotulo: temVeredito ? 'Conformes' : 'Apurados',
      valor: bom,
    },
    ruim: {
      rotulo: temVeredito ? 'Não conformes' : 'Camada indisponível',
      valor: ruim,
    },
    // o que mudou em relacao a versao que esta vigente hoje
    comparacao:
      antes > 0 || pctAntes != null
        ? {
            calculadosAntes: antes,
            pctBomAntes: pctAntes,
            delta: pctAntes == null ? null : pctBom - pctAntes,
          }
        : null,
    situacoes: (Array.isArray(ind?.situacoes) ? ind.situacoes : []).map((s) => ({
      codigo: s?.situacao ?? null,
      rotulo: rotularSituacao(s?.situacao),
      classe: classeDaSituacao(s?.situacao),
      quantidade: numero(s?.quantidade),
      quantidadeComparada: numero(s?.quantidadeComparada),
    })),
  }
}

function montarDetalhe(versaoItem, resposta) {
  const aprovadas = numero(versaoItem?.aprovadas)
  const rejeitadas = numero(versaoItem?.rejeitadas)
  const recebidas = numero(versaoItem?.recebidas) || aprovadas + rejeitadas

  const percentual = recebidas > 0 ? Math.round((aprovadas / recebidas) * 100) : 100

  const indicadores = Array.isArray(resposta?.indicadores) ? resposta.indicadores : []
  const blocos = indicadores.map(montarBloco)

  // quantos imoveis a versao calculou: o maior entre os indicadores, porque cada um
  // cobre o conjunto de imoveis cuja camada veio no arquivo
  const imoveisCalculados = blocos.length ? Math.max(...blocos.map((b) => b.total)) : null

  const regrasQueFalharam = Array.isArray(versaoItem?.regrasQueFalharam)
    ? versaoItem.regrasQueFalharam
    : []

  const temBloqueio = regrasQueFalharam.some((r) => r.severidade === 'BLOQUEIA')

  const conclusao =
    versaoItem?.conclusao ?? {
      classe: temBloqueio ? 'erro' : rejeitadas > 0 ? 'aviso' : 'sucesso',
      texto: temBloqueio
        ? 'Bloqueada por regras'
        : rejeitadas > 0
          ? 'Atenção na quarentena'
          : 'Pronta para publicar',
    }

  return {
    conclusao,
    recebidas,
    entraram: aprovadas,
    quarentena: rejeitadas,
    imoveisCalculados: imoveisCalculados || null,
    percentual,
    percentualTexto: percentual.toLocaleString('pt-BR'),
    blocos,
    regrasQueFalharam,
    motivos: Array.isArray(versaoItem?.motivos) ? versaoItem.motivos : [],
    versaoComparadaId: resposta?.versaoComparadaId ?? null,
    versaoComparadaNumero: resposta?.versaoComparadaNumero ?? null,
  }
}

export const qualidadeIndicadoresService = {
  // contagem por situacao desta versao, ja comparada com a vigente
  async indicadoresDaVersao(versaoId, { signal } = {}) {
    const { data } = await api.get(ROTA(versaoId), { signal, timeout: 30000 })
    return data
  },

  async carregarDetalhe(versaoItem, { signal } = {}) {
    const id = versaoItem?.id
    if (id == null) return montarDetalhe(versaoItem, null)

    try {
      return montarDetalhe(versaoItem, await this.indicadoresDaVersao(id, { signal }))
    } catch (erro) {
      if (requisicaoIndicadoresCancelada(erro)) throw erro
      // a versao pode nao ter indicador calculado ainda: isso nao e falha do painel,
      // mostra o resto do detalhe e deixa a lista de blocos vazia
      if (erro?.response?.status === 404) return montarDetalhe(versaoItem, null)
      throw new Error(mensagemErroIndicadores(erro), { cause: erro })
    }
  },
}

export default qualidadeIndicadoresService
