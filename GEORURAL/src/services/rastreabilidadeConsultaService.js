import { computed, ref } from 'vue'
import { rastreabilidadeService } from './rastreabilidadeService'

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

  function notificar(erro, mensagemPadrao) {
    feedback.value = {
      id: ++sequencia,
      tipo: 'erro',
      mensagem: erro?.message || mensagemPadrao,
    }
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

    carregandoConjuntos.value = true
    erroConjuntos.value = false

    conjuntoId.value = ''
    conjuntos.value = []
    limparArquivos()

    try {
      const resposta = await rastreabilidadeService.listarConjuntos({
        signal: consulta.signal,
      })

      if (destruido || consulta.signal.aborted) return

      conjuntos.value = resposta
    } catch (erro) {
      if (destruido || consulta.signal.aborted) return

      erroConjuntos.value = true

      notificar(
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

    conjuntoId.value = String(id ?? '')
    limparArquivos()

    if (!conjuntoSelecionado.value) return

    const consulta = new AbortController()
    consultaArquivos = consulta

    carregandoArquivos.value = true

    try {
      const resposta = await rastreabilidadeService.listarArquivos(
        conjuntoSelecionado.value.id,
        { signal: consulta.signal },
      )

      if (destruido || consulta.signal.aborted) return

      arquivos.value = resposta
    } catch (erro) {
      if (destruido || consulta.signal.aborted) return

      erroArquivos.value = true

      notificar(
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

    limparTrajetoria()

    arquivoId.value = String(id ?? '')

    if (!arquivoSelecionado.value) return

    const consulta = new AbortController()
    consultaTrajetoria = consulta

    carregandoTrajetoria.value = true

    try {
      const resposta = await rastreabilidadeService.consultarTrajetoria(
        arquivoSelecionado.value.id,
        { signal: consulta.signal },
      )

      if (destruido || consulta.signal.aborted) return

      trajetoria.value = resposta
    } catch (erro) {
      if (destruido || consulta.signal.aborted) return

      erroTrajetoria.value = true

      notificar(
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

  function fecharFeedback() {
    feedback.value = null
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
    fecharFeedback,
    destruir,
  }
}
