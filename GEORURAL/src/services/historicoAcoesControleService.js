import { computed, ref, watch } from 'vue'
import {
  historicoAcoesService,
  prepararHistorico,
  consultaHistoricoCancelada,
  mensagemErroHistorico,
  validarIdHistorico,
} from './historicoAcoesService'

export function criarControleHistorico(servico = historicoAcoesService) {
  const dias = ref(7),
    operacao = ref(''),
    entidade = ref(''),
    responsavel = ref(''),
    busca = ref('')
  const eventos = ref([]),
    eventoSelecionado = ref(null),
    carregando = ref(false),
    erro = ref('')
  const pagina = ref(0),
    total = ref(0),
    totalPaginas = ref(0),
    arquivoBrutoId = ref('')
  let consulta,
    agendamento,
    destruido = false
  const visao = computed(() =>
    prepararHistorico(eventos.value, {
      entidade: entidade.value,
      busca: busca.value,
      arquivoBrutoId: arquivoBrutoId.value,
    }),
  )
  async function consultarAuditoria() {
    clearTimeout(agendamento)
    consulta?.abort()
    const atual = new AbortController()
    consulta = atual
    carregando.value = true
    erro.value = ''
    eventos.value = []
    eventoSelecionado.value = null
    try {
      const dados = await servico.listar(
        {
          dias: dias.value,
          acao: operacao.value,
          usuarioId: responsavel.value,
          pagina: pagina.value,
        },
        { signal: atual.signal },
      )
      if (destruido || atual.signal.aborted) return
      eventos.value = dados.eventos
      total.value = dados.total
      totalPaginas.value = dados.totalPaginas
    } catch (falha) {
      if (!destruido && !atual.signal.aborted && !consultaHistoricoCancelada(falha)) {
        eventos.value = []
        total.value = 0
        totalPaginas.value = 0
        erro.value = mensagemErroHistorico(falha)
      }
    } finally {
      if (!destruido && consulta === atual) carregando.value = false
    }
  }
  const pararFiltros = watch([dias, operacao, responsavel], () => {
    consulta?.abort()
    eventos.value = []
    pagina.value = 0
    carregando.value = true
    clearTimeout(agendamento)
    agendamento = setTimeout(consultarAuditoria, 300)
  })
  function mudarPagina(valor) {
    if (
      carregando.value ||
      !Number.isSafeInteger(valor) ||
      valor < 0 ||
      valor >= totalPaginas.value
    )
      return
    pagina.value = valor
    return consultarAuditoria()
  }
  function destruir() {
    destruido = true
    pararFiltros()
    clearTimeout(agendamento)
    consulta?.abort()
  }
  return {
    dias,
    operacao,
    entidade,
    responsavel,
    busca,
    eventos,
    eventoSelecionado,
    carregando,
    erro,
    pagina,
    total,
    totalPaginas,
    arquivoBrutoId,
    consultarAuditoria,
    mudarPagina,
    destruir,
    selecionarArquivo(valor) {
      try {
        arquivoBrutoId.value = valor ? validarIdHistorico(valor) : ''
      } catch (falha) {
        arquivoBrutoId.value = ''
        erro.value = falha.message
      }
    },
    eventosFiltrados: computed(() => visao.value.eventosFiltrados),
    resumo: computed(() => visao.value.resumo),
    gruposPorDia: computed(() => visao.value.gruposPorDia),
    eventoMaisAntigo: computed(() => visao.value.eventoMaisAntigo),
    responsaveisDisponiveis: computed(() => visao.value.responsaveisDisponiveis),
    abrirModal(evento) {
      eventoSelecionado.value = evento
    },
    fecharModal() {
      eventoSelecionado.value = null
    },
  }
}