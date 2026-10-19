import { computed, ref } from 'vue'
import { rastreabilidadeService } from './rastreabilidadeService'

import {
  obterMensagemErro,
  requisicaoCancelada,
} from './rastreabilidadeErroService'

export function criarConsultaRastreabilidade() {
  const conjuntos = ref([])
  const arquivos = ref([])
  const trajetoria = ref(null)

  const conjuntoId = ref('')
  const arquivoId = ref('')

  const carregandoConjuntos = ref(false)
  const carregandoArquivos = ref(false)
  const carregandoTrajetoria = ref(false)

  const erroConjuntos = ref(false)
  const erroArquivos = ref(false)
  const erroTrajetoria = ref(false)

  const feedback = ref(null)

  let consultaConjuntos = null
  let consultaArquivos = null
  let consultaTrajetoria = null
  let destruido = false
  let sequencia = 0

  const conjuntoSelecionado = computed(() =>
    conjuntos.value.find(
      (conjunto) =>
        String(conjunto.id) === String(conjuntoId.value),
    ) ?? null,
  )

  const arquivoSelecionado = computed(() =>
    arquivos.value.find(
      (arquivo) =>
        String(arquivo.id) === String(arquivoId.value),
    ) ?? null,
  )

  function notificarErro(mensagem) {
    if (destruido || typeof mensagem !== 'string') return

    const texto = mensagem.trim()

    if (!texto) return

    if (
      feedback.value?.tipo === 'erro' &&
      feedback.value.mensagem === texto
    ) {
      return
    }

    feedback.value = {
      id: ++sequencia,
      tipo: 'erro',
      mensagem: texto,
    }
  }

  function notificarFalha(erro, mensagemPadrao) {
    if (requisicaoCancelada(erro)) return

    notificarErro(
      obterMensagemErro(erro, mensagemPadrao),
    )
  }

  function fecharFeedback() {
    feedback.value = null
  }

  function limparTrajetoria() {
    consultaTrajetoria?.abort()
    consultaTrajetoria = null

    arquivoId.value = ''
    trajetoria.value = null
    erroTrajetoria.value = false
    carregandoTrajetoria.value = false
  }

  function limparArquivos() {
    consultaArquivos?.abort()
    consultaArquivos = null

    arquivos.value = []
    erroArquivos.value = false
    carregandoArquivos.value = false

    limparTrajetoria()
  }

  async function carregarConjuntos() {
    if (destruido) return

    consultaConjuntos?.abort()

    const consulta = new AbortController()
    consultaConjuntos = consulta

    fecharFeedback()

    carregandoConjuntos.value = true
    erroConjuntos.value = false

    conjuntoId.value = ''
    conjuntos.value = []
    limparArquivos()

    try {
      const resposta =
        await rastreabilidadeService.listarConjuntos({
          signal: consulta.signal,
        })

      if (
        destruido ||
        consulta.signal.aborted ||
        consultaConjuntos !== consulta
      ) {
        return
      }

      conjuntos.value = resposta
    } catch (erro) {
      if (
        destruido ||
        consulta.signal.aborted ||
        consultaConjuntos !== consulta ||
        requisicaoCancelada(erro)
      ) {
        return
      }

      erroConjuntos.value = true

      notificarFalha(
        erro,
        'Não foi possível consultar os conjuntos.',
      )
    } finally {
      if (!destruido && consultaConjuntos === consulta) {
        carregandoConjuntos.value = false
      }
    }
  }

  async function selecionarConjunto(id) {
    if (destruido) return

    fecharFeedback()

    conjuntoId.value = String(id ?? '')
    limparArquivos()

    if (!conjuntoSelecionado.value) return

    const consulta = new AbortController()
    consultaArquivos = consulta

    carregandoArquivos.value = true

    try {
      const resposta =
        await rastreabilidadeService.listarArquivos(
          conjuntoSelecionado.value.id,
          { signal: consulta.signal },
        )

      if (
        destruido ||
        consulta.signal.aborted ||
        consultaArquivos !== consulta
      ) {
        return
      }

      arquivos.value = resposta
    } catch (erro) {
      if (
        destruido ||
        consulta.signal.aborted ||
        consultaArquivos !== consulta ||
        requisicaoCancelada(erro)
      ) {
        return
      }

      erroArquivos.value = true

      notificarFalha(
        erro,
        'Não foi possível consultar os arquivos.',
      )
    } finally {
      if (!destruido && consultaArquivos === consulta) {
        carregandoArquivos.value = false
      }
    }
  }

  async function selecionarArquivo(id) {
    if (destruido) return

    fecharFeedback()
    limparTrajetoria()

    arquivoId.value = String(id ?? '')

    if (!arquivoSelecionado.value) return

    const consulta = new AbortController()
    consultaTrajetoria = consulta

    carregandoTrajetoria.value = true

    try {
      const resposta =
        await rastreabilidadeService.consultarTrajetoria(
          arquivoSelecionado.value.id,
          { signal: consulta.signal },
        )

      if (
        destruido ||
        consulta.signal.aborted ||
        consultaTrajetoria !== consulta
      ) {
        return
      }

      trajetoria.value = resposta
    } catch (erro) {
      if (
        destruido ||
        consulta.signal.aborted ||
        consultaTrajetoria !== consulta ||
        requisicaoCancelada(erro)
      ) {
        return
      }

      erroTrajetoria.value = true

      notificarFalha(
        erro,
        'Não foi possível consultar a trajetória.',
      )
    } finally {
      if (!destruido && consultaTrajetoria === consulta) {
        carregandoTrajetoria.value = false
      }
    }
  }

  function tentarArquivosNovamente() {
    return selecionarConjunto(conjuntoId.value)
  }

  function tentarTrajetoriaNovamente() {
    return selecionarArquivo(arquivoId.value)
  }

  function destruir() {
    destruido = true

    consultaConjuntos?.abort()
    consultaArquivos?.abort()
    consultaTrajetoria?.abort()
  }

  return {
    conjuntos,
    arquivos,
    trajetoria,
    conjuntoId,
    arquivoId,
    conjuntoSelecionado,
    arquivoSelecionado,
    carregandoConjuntos,
    carregandoArquivos,
    carregandoTrajetoria,
    erroConjuntos,
    erroArquivos,
    erroTrajetoria,
    feedback,
    carregarConjuntos,
    selecionarConjunto,
    selecionarArquivo,
    tentarArquivosNovamente,
    tentarTrajetoriaNovamente,
    notificarErro,
    fecharFeedback,
    destruir,
  }
}
