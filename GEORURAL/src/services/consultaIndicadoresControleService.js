import { computed, ref } from 'vue'
import {
  consultaIndicadoresService,
  prepararOpcoesVersoes,
  mensagemErroConsultaIndicadores,
  consultaIndicadoresCancelada,
} from './consultaIndicadoresService'

export function criarControleConsultaIndicadores(servico = consultaIndicadoresService) {
  const indicador = ref(''),
    versao = ref(''),
    municipio = ref(''),
    busca = ref('')
  const catalogo = ref([]),
    versoes = ref([]),
    itens = ref([]),
    series = ref(null)
  const carregando = ref(false),
    carregandoOpcoes = ref(false),
    erro = ref(''),
    erroGraficos = ref(''),
    erroOpcoes = ref('')
  const paginaAtual = ref(1),
    totalResultados = ref(0),
    totalPaginas = ref(0),
    imovelSelecionado = ref(null)
  const aplicado = ref(null)
  let consulta,
    consultaOpcoes,
    destruido = false
  const opcoesVersoes = computed(() => prepararOpcoesVersoes(versoes.value, indicador.value))
  const metaAtual = computed(
    () =>
      catalogo.value.find((i) => i.sigla === (aplicado.value?.indicador || indicador.value)) || {
        rotulo: '',
        nome: '',
        unidade: '',
      },
  )
  async function buscarIndicadores(pagina = 1, novosFiltros = false) {
    if (!indicador.value) return
    if (novosFiltros || !aplicado.value)
      aplicado.value = {
        indicador: indicador.value,
        versao: versao.value,
        municipio: municipio.value,
        busca: busca.value,
      }
    const filtros = { ...aplicado.value }
    consulta?.abort()
    const atual = new AbortController()
    consulta = atual
    carregando.value = true
    itens.value = []
    series.value = null
    imovelSelecionado.value = null
    erro.value = ''
    erroGraficos.value = ''
    paginaAtual.value = pagina
    try {
      const [tabela, graficos] = await Promise.allSettled([
        servico.resultados(filtros, pagina, { signal: atual.signal }),
        servico.series(filtros, { signal: atual.signal }),
      ])
      if (destruido || atual.signal.aborted) return
      if (tabela.status === 'fulfilled') {
        itens.value = tabela.value.itens
        totalResultados.value = tabela.value.total
        totalPaginas.value = tabela.value.totalPaginas
      } else {
        totalResultados.value = 0
        totalPaginas.value = 0
        erro.value = mensagemErroConsultaIndicadores(tabela.reason)
      }
      if (graficos.status === 'fulfilled') series.value = graficos.value
      else erroGraficos.value = mensagemErroConsultaIndicadores(graficos.reason)
    } finally {
      if (!destruido && consulta === atual) carregando.value = false
    }
  }
  async function carregarOpcoesFiltros() {
    consultaOpcoes?.abort()
    const atual = new AbortController()
    consultaOpcoes = atual
    carregandoOpcoes.value = true
    erroOpcoes.value = ''
    try {
      const [indicadores, listaVersoes] = await Promise.allSettled([
        servico.catalogo({ signal: atual.signal }),
        servico.versoes({ signal: atual.signal }),
      ])
      if (destruido || atual.signal.aborted) return
      if (indicadores.status === 'rejected') {
        erro.value = mensagemErroConsultaIndicadores(indicadores.reason)
        return
      }
      catalogo.value = indicadores.value
      if (!catalogo.value.some((i) => i.sigla === indicador.value))
        indicador.value =
          catalogo.value.find((i) => i.sigla === 'IRL')?.sigla || catalogo.value[0]?.sigla || ''
      versoes.value = listaVersoes.status === 'fulfilled' ? listaVersoes.value : []
      if (listaVersoes.status === 'rejected')
        erroOpcoes.value = mensagemErroConsultaIndicadores(listaVersoes.reason)
      if (indicador.value) await buscarIndicadores(1, true)
    } catch (falha) {
      if (!destruido && !atual.signal.aborted && !consultaIndicadoresCancelada(falha))
        erro.value = mensagemErroConsultaIndicadores(falha)
    } finally {
      if (!destruido && consultaOpcoes === atual) carregandoOpcoes.value = false
    }
  }
  return {
    indicador,
    versao,
    municipio,
    busca,
    catalogo,
    itens,
    series,
    paginaAtual,
    totalResultados,
    totalPaginas,
    carregando,
    carregandoOpcoes,
    erro,
    erroGraficos,
    erroOpcoes,
    metaAtual,
    opcoesVersoes,
    imovelSelecionado,
    carregarOpcoesFiltros,
    buscarIndicadores,
    aplicarFiltros() {
      return buscarIndicadores(1, true)
    },
    trocarIndicador() {
      versao.value = ''
      return buscarIndicadores(1, true)
    },
    abrirModal(item) {
      imovelSelecionado.value = item
    },
    fecharModal() {
      imovelSelecionado.value = null
    },
    destruir() {
      destruido = true
      consulta?.abort()
      consultaOpcoes?.abort()
    },
  }
}
