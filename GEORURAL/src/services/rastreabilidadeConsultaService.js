import { ref } from 'vue'

import {
  rastreabilidadeService,
  prepararDetalheEvento,
} from './rastreabilidadeService'

import {
  obterMensagemErro,
  requisicaoCancelada,
} from './rastreabilidadeErroService'

export function criarConsultaRastreabilidade() {
  const conjuntoId = ref('')
  const trajetoria = ref(null)

  const carregando = ref(false)
  const falhou = ref(false)
  const feedback = ref(null)

  const detalheAberto = ref(false)
  const camposDetalhe = ref([])
  const eventoSelecionado = ref('')

  let consultaAtual = null
  let destruido = false
  let sequencia = 0
  let ultimoId = ''

  function notificarErro(mensagem) {
    if (
      destruido ||
      typeof mensagem !== 'string' ||
      !mensagem.trim()
    ) {
      return
    }

    const texto = mensagem.trim()

    if (feedback.value?.mensagem === texto) {
      return
    }

    feedback.value = {
      id: ++sequencia,
      tipo: 'erro',
      mensagem: texto,
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

  function abrirEvento(chave) {
    const evento = trajetoria.value?.eventos.find(
      (item) => item.chave === chave,
    )

    if (!evento) return

    camposDetalhe.value = prepararDetalheEvento(evento)
    eventoSelecionado.value = chave
    detalheAberto.value = true
  }

  async function consultar(id = conjuntoId.value) {
    if (destruido) return

    consultaAtual?.abort()

    const consulta = new AbortController()
    consultaAtual = consulta

    ultimoId = String(id ?? '').trim()

    fecharFeedback()
    fecharDetalhe()

    trajetoria.value = null
    falhou.value = false
    carregando.value = true

    try {
      const dados =
        await rastreabilidadeService.consultarTrajetoria(
          ultimoId,
          { signal: consulta.signal },
        )

      if (
        destruido ||
        consulta.signal.aborted ||
        consultaAtual !== consulta
      ) {
        return
      }

      trajetoria.value = dados
    } catch (erro) {
      if (
        destruido ||
        consulta.signal.aborted ||
        consultaAtual !== consulta ||
        requisicaoCancelada(erro)
      ) {
        return
      }

      falhou.value = true

      notificarErro(
        obterMensagemErro(erro),
      )
    } finally {
      if (!destruido && consultaAtual === consulta) {
        carregando.value = false
      }
    }
  }

  function tentarNovamente() {
    return consultar(ultimoId)
  }

  function destruir() {
    destruido = true
    consultaAtual?.abort()
  }

  return {
    conjuntoId,
    trajetoria,
    carregando,
    falhou,
    feedback,
    detalheAberto,
    camposDetalhe,
    eventoSelecionado,
    consultar,
    tentarNovamente,
    abrirEvento,
    fecharDetalhe,
    notificarErro,
    fecharFeedback,
    destruir,
  }
}
