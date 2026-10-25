import { computed, ref } from 'vue'

import {
  rastreabilidadeService,
  prepararDetalheEvento,
} from './rastreabilidadeService'

import {
  obterMensagemErro,
  requisicaoCancelada,
} from './rastreabilidadeErroService'

export function criarConsultaRastreabilidade() {
  const conjuntos = ref([])
  const conjuntoId = ref('')
  const arquivoId = ref('')
  const resposta = ref(null)

  const carregandoConjuntos = ref(false)
  const carregando = ref(false)
  const falhouConjuntos = ref(false)
  const falhou = ref(false)
  const feedback = ref(null)

  const detalheAberto = ref(false)
  const camposDetalhe = ref([])
  const eventoSelecionado = ref('')

  let consultaConjuntos = null
  let consultaAtual = null
  let destruido = false
  let sequencia = 0

  const arquivos = computed(() =>
    resposta.value?.arquivos ?? [],
  )

  const trajetoria = computed(() =>
    arquivos.value.find(arquivo =>
      arquivo.id === String(arquivoId.value),
    ) ?? null,
  )

  function notificarErro(erro) {
    if (destruido || requisicaoCancelada(erro)) return

    const mensagem = typeof erro === 'string'
      ? erro.trim()
      : obterMensagemErro(erro)

    if (!mensagem) return

    feedback.value = {
      id: ++sequencia,
      tipo: 'erro',
      mensagem,
    }
  }

  function fecharFeedback() {
    feedback.value = null
  }

  function fecharDetalhe() {
    detalheAberto.value = false
    camposDetalhe.value = []
    eventoSelecionado.value = ''
  }

  function selecionarArquivo(id) {
    arquivoId.value = String(id ?? '')
    fecharDetalhe()
  }

  function abrirEvento(chave) {
    const evento = trajetoria.value?.eventos.find(item =>
      item.chave === chave,
    )

    if (!evento) return

    camposDetalhe.value = prepararDetalheEvento(evento)
    eventoSelecionado.value = chave
    detalheAberto.value = true
  }

  async function carregarConjuntos() {
    if (destruido) return

    consultaConjuntos?.abort()

    const atual = new AbortController()
    consultaConjuntos = atual

    carregandoConjuntos.value = true
    falhouConjuntos.value = false

    try {
      const dados = await rastreabilidadeService.listarConjuntos({
        signal: atual.signal,
      })

      if (
        destruido ||
        atual.signal.aborted ||
        consultaConjuntos !== atual
      ) {
        return
      }

      conjuntos.value = dados
    } catch (erro) {
      if (
        destruido ||
        atual.signal.aborted ||
        consultaConjuntos !== atual ||
        requisicaoCancelada(erro)
      ) {
        return
      }

      falhouConjuntos.value = true
      notificarErro(erro)
    } finally {
      if (!destruido && consultaConjuntos === atual) {
        carregandoConjuntos.value = false
        consultaConjuntos = null
      }
    }
  }

  async function consultar(id = conjuntoId.value) {
    if (destruido) return

    consultaAtual?.abort()

    const atual = new AbortController()
    consultaAtual = atual

    conjuntoId.value = String(id ?? '')
    resposta.value = null
    arquivoId.value = ''
    falhou.value = false

    fecharFeedback()
    fecharDetalhe()

    if (!conjuntoId.value) {
      carregando.value = false
      return
    }

    carregando.value = true

    try {
      const dados = await rastreabilidadeService.consultarTrajetoria(
        conjuntoId.value,
        { signal: atual.signal },
      )

      if (
        destruido ||
        atual.signal.aborted ||
        consultaAtual !== atual
      ) {
        return
      }

      resposta.value = dados
      arquivoId.value = dados.arquivos[0]?.id ?? ''
    } catch (erro) {
      if (
        destruido ||
        atual.signal.aborted ||
        consultaAtual !== atual ||
        requisicaoCancelada(erro)
      ) {
        return
      }

      falhou.value = true
      notificarErro(erro)
    } finally {
      if (!destruido && consultaAtual === atual) {
        carregando.value = false
        consultaAtual = null
      }
    }
  }

  function tentarNovamente() {
    return consultar(conjuntoId.value)
  }

  function destruir() {
    destruido = true
    consultaAtual?.abort()
    consultaConjuntos?.abort()
  }

  return {
    conjuntos,
    conjuntoId,
    arquivoId,
    arquivos,
    trajetoria,
    carregandoConjuntos,
    carregando,
    falhouConjuntos,
    falhou,
    feedback,
    detalheAberto,
    camposDetalhe,
    eventoSelecionado,
    carregarConjuntos,
    consultar,
    tentarNovamente,
    selecionarArquivo,
    abrirEvento,
    fecharDetalhe,
    notificarErro,
    fecharFeedback,
    destruir,
  }
}
