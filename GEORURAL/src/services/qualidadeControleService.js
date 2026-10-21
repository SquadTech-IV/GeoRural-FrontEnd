import { computed, ref } from 'vue'

import {
  publicacaoService,
  requisicaoPublicacaoCancelada,
  validarIdPublicacao,
} from './publicacaoService'

import {
  prepararSolicitacaoPublicacao,
} from './fluxoPublicacaoService'

import {
  criarFeedbackPublicacao,
} from './publicacaoErroService'

export function criarControleQualidade() {
  const execucaoId = ref('')
  const versaoId = ref('')
  const motivoReprovacao = ref('')

  const resultado = ref(null)
  const versao = ref(null)

  const carregando = ref(false)
  const publicando = ref(false)
  const reprovando = ref(false)
  const falhouConferencia = ref(false)

  const versoesPublicadas = ref([])

  const feedback = criarFeedbackPublicacao()

  const ocupado = computed(() =>
    carregando.value ||
    publicando.value ||
    reprovando.value,
  )

  let consulta = null
  let destruido = false

  function selecionarExecucao(valor) {
    if (publicando.value || reprovando.value) return

    consulta?.abort()
    consulta = null

    carregando.value = false
    execucaoId.value = String(valor ?? '')
    resultado.value = null
    falhouConferencia.value = false

    feedback.registrarErro('conferencia', null)
  }

  function selecionarVersao(valor) {
    if (publicando.value || reprovando.value) return

    versaoId.value = String(valor ?? '')
    versao.value = null
    motivoReprovacao.value = ''

    feedback.registrarErro('publicacao', null)
  }

  const versaoSelecionada = computed(() => {
    const id = versaoId.value.trim()

    if (versao.value?.id === id) {
      return versao.value
    }

    return id ? { id } : null
  })

  const versaoConfirmada = computed(() =>
    versao.value?.id === versaoId.value.trim()
      ? versao.value
      : null,
  )

  async function consultar() {
    if (
      destruido ||
      publicando.value ||
      reprovando.value
    ) {
      return
    }

    consulta?.abort()

    const atual = new AbortController()
    consulta = atual

    carregando.value = true
    resultado.value = null
    falhouConferencia.value = false

    feedback.registrarErro('conferencia', null)

    try {
      const dados =
        await publicacaoService.consultarQualidade(
          execucaoId.value,
          { signal: atual.signal },
        )

      if (
        destruido ||
        atual.signal.aborted ||
        consulta !== atual
      ) {
        return
      }

      resultado.value = dados
    } catch (erro) {
      if (
        destruido ||
        atual.signal.aborted ||
        consulta !== atual ||
        requisicaoPublicacaoCancelada(erro)
      ) {
        return
      }

      resultado.value = null
      falhouConferencia.value = true

      feedback.registrarErro('conferencia', erro)
    } finally {
      if (!destruido && consulta === atual) {
        carregando.value = false
        consulta = null
      }
    }
  }

  async function publicar(solicitacao) {
    if (destruido || ocupado.value) return

    feedback.registrarErro('publicacao', null)

    try {
      const dados = prepararSolicitacaoPublicacao({
        resultado: resultado.value,
        versao: versaoSelecionada.value,
      })

      if (
        String(solicitacao?.versaoId) !==
          dados.versaoId ||
        String(solicitacao?.execucaoId) !==
          dados.execucaoId
      ) {
        throw new Error(
          'A seleção foi alterada. Confira os dados e confirme novamente.',
        )
      }

      publicando.value = true

      const publicada =
        await publicacaoService.publicar(
          dados.versaoId,
        )

      if (destruido) return

      versao.value = publicada

      versoesPublicadas.value = [
        publicada,
        ...versoesPublicadas.value.filter(
          item => item.id !== publicada.id,
        ),
      ]

      feedback.notificar(
        'sucesso',
        'Publicação confirmada',
        `A versão ${publicada.numero} foi publicada pelo servidor.`,
      )

      if (
        publicada.execucaoId !==
        String(resultado.value?.execucaoId)
      ) {
        execucaoId.value = publicada.execucaoId
        resultado.value = null

        feedback.notificar(
          'aviso',
          'Execução vinculada',
          'A versão publicada está vinculada a outra execução. Consulte os resultados da execução retornada pelo servidor.',
        )
      }
    } catch (erro) {
      if (!destruido) {
        feedback.registrarErro('publicacao', erro)
      }
    } finally {
      if (!destruido) {
        publicando.value = false
      }
    }
  }

  async function registrarReprovacao() {
    if (destruido || ocupado.value) return

    feedback.registrarErro('publicacao', null)

    try {
      const id = validarIdPublicacao(
        versaoId.value,
      )

      if (
        versaoConfirmada.value &&
        versaoConfirmada.value.situacao !==
          'RASCUNHO'
      ) {
        throw new Error(
          'Somente versões em rascunho aceitam o registro de reprovação.',
        )
      }

      if (!motivoReprovacao.value.trim()) {
        throw new Error(
          'Informe o motivo da reprovação.',
        )
      }

      reprovando.value = true

      const resposta =
        await publicacaoService.reprovar(
          id,
          motivoReprovacao.value,
        )

      if (destruido) return

      versao.value = resposta
      motivoReprovacao.value = ''

      feedback.notificar(
        'sucesso',
        'Justificativa registrada',
        `O servidor registrou a justificativa. Situação retornada: ${resposta.situacao}.`,
      )
    } catch (erro) {
      if (!destruido) {
        feedback.registrarErro('publicacao', erro)
      }
    } finally {
      if (!destruido) {
        reprovando.value = false
      }
    }
  }

  function destruir() {
    destruido = true
    consulta?.abort()
  }

  return {
    execucaoId,
    versaoId,
    motivoReprovacao,
    resultado,
    versaoSelecionada,
    versaoConfirmada,
    carregando,
    publicando,
    reprovando,
    ocupado,
    falhouConferencia,
    versoesPublicadas,
    notificacoes: feedback.notificacoes,
    fechar: feedback.fechar,
    selecionarExecucao,
    selecionarVersao,
    consultar,
    publicar,
    registrarReprovacao,
    destruir,
  }
}
