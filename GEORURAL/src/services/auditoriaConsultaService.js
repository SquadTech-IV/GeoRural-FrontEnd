import { computed, ref, watch } from 'vue'

import {
  auditoriaService,
  requisicaoAuditoriaCancelada,
} from './auditoriaService'

function texto(valor) {
  return String(valor ?? '').trim()
}

function prepararResultado(item, indice) {
  const registro =
    item && typeof item === 'object'
      ? item
      : {}

  return {
    chave: String(
      registro.id ??
      registro.resultadoId ??
      `registro-${indice}`,
    ),
    id: registro.id ?? registro.resultadoId ?? null,
    imovel: texto(
      registro.imovelNome ??
      registro.imovel?.nome ??
      (
        typeof registro.imovel === 'string'
          ? registro.imovel
          : ''
      ),
    ) || 'Imóvel não informado',
    car: texto(
      registro.codigoCar ??
      registro.imovelCar ??
      registro.car ??
      registro.imovel?.codigoCar,
    ),
    indicador: texto(
      registro.indicadorSigla ??
      registro.indicador?.sigla ??
      (
        typeof registro.indicador === 'string'
          ? registro.indicador
          : ''
      ),
    ) || 'Não informado',
    valor: registro.valorPercentual ??
      registro.valorAbsoluto ??
      registro.valor ??
      null,
    original: registro,
  }
}

export function criarConsultaAuditoria() {
  const resultados = ref([])
  const busca = ref('')
  const indicador = ref('')
  const selecionado = ref(null)

  const carregando = ref(false)
  const falhou = ref(false)
  const consultado = ref(false)
  const mensagem = ref('')
  const totalServidor = ref(null)

  let consulta = null
  let destruido = false

  const siglas = ref([])
  const indicadores = computed(() => siglas.value)
  const resultadosFiltrados = computed(() => resultados.value)
  let agendamento = null

  const pararFiltros = watch([busca, indicador], () => {
    clearTimeout(agendamento)
    consulta?.abort()
    agendamento = setTimeout(consultar, 300)
  })

  const listaParcial = computed(() =>
    totalServidor.value !== null &&
    totalServidor.value > resultados.value.length,
  )

  async function consultar() {
    if (destruido) return

    clearTimeout(agendamento)
    consulta?.abort()

    const atual = new AbortController()
    consulta = atual

    carregando.value = true
    falhou.value = false
    consultado.value = false
    mensagem.value = ''
    resultados.value = []
    selecionado.value = null
    totalServidor.value = null

    try {
      const resposta =
        await auditoriaService.listarResultados(
          {
            indicador: indicador.value || 'TODOS',
            busca: busca.value.trim() || undefined,
          },
          { signal: atual.signal },
        )

      if (
        destruido ||
        atual.signal.aborted ||
        consulta !== atual
      ) {
        return
      }

      const lista = Array.isArray(resposta)
        ? resposta
        : resposta.content

      resultados.value = lista.map(
        prepararResultado,
      )

      siglas.value = [...new Set([
        ...siglas.value,
        ...resultados.value.map(item => item.indicador),
      ])].sort()

      if (
        !Array.isArray(resposta) &&
        Number.isSafeInteger(resposta.totalElements)
      ) {
        totalServidor.value = resposta.totalElements
      }

      consultado.value = true
    } catch (erro) {
      if (
        destruido ||
        atual.signal.aborted ||
        consulta !== atual ||
        requisicaoAuditoriaCancelada(erro)
      ) {
        return
      }

      falhou.value = true
      mensagem.value = erro.message
    } finally {
      if (!destruido && consulta === atual) {
        carregando.value = false
        consulta = null
      }
    }
  }

  function selecionar(item) {
    selecionado.value = item
  }

  function fecharMensagem() {
    mensagem.value = ''
  }

  function destruir() {
    destruido = true
    pararFiltros()
    clearTimeout(agendamento)
    consulta?.abort()
  }

  return {
    busca,
    indicador,
    indicadores,
    resultadosFiltrados,
    selecionado,
    carregando,
    falhou,
    consultado,
    mensagem,
    listaParcial,
    consultar,
    selecionar,
    fecharMensagem,
    destruir,
  }
}
