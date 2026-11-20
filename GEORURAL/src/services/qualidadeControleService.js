import { computed, ref } from 'vue'
import {
  publicacaoService,
  requisicaoPublicacaoCancelada,
  validarIdPublicacao,
} from './publicacaoService'
import { prepararSolicitacaoPublicacao } from './fluxoPublicacaoService'
import { criarFeedbackPublicacao } from './publicacaoErroService'
import qualidadeIndicadoresService, {
  requisicaoIndicadoresCancelada,
} from './qualidadeIndicadoresService'

export function formatarNumero(valor) {
  return Number(valor ?? 0).toLocaleString('pt-BR')
}

export function formatarData(valor) {
  if (!valor) return '—'
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return String(valor)

  return data.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function normalizarVersaoFila(v) {
  const rejeitadas = Number(v.registrosEmQuarentena ?? v.rejeitadas ?? 0)
  const aprovadas = Number(v.registrosAprovados ?? v.aprovadas ?? 0)
  const automatica = Boolean(v.automatica ?? v.dagRunId)

  return {
    ...v,
    id: String(v.id),
    numero: v.numero ?? v.id,
    conjunto: v.conjunto ?? v.nomeConjunto ?? 'Conjunto principal',
    automatica,
    arquivo: v.arquivo ?? v.nomeArquivo ?? '—',
    geradaEm: v.geradaEm ?? v.criadoEm ?? null,
    quem: v.quem ?? v.autor ?? (automatica ? 'Airflow' : 'Operador'),
    aprovadas,
    rejeitadas,
    conclusao: v.conclusao ?? {
      classe: rejeitadas > 0 ? 'aviso' : 'sucesso',
      texto: rejeitadas > 0 ? 'Com ressalvas' : 'Aprovada',
    },
  }
}

export function criarControleQualidade() {
  const execucaoId = ref('')
  const versaoId = ref('')
  const motivoReprovacao = ref('')
  const justificativa = ref('')

  const resultado = ref(null)
  const versao = ref(null)
  const detalhe = ref(null)

  const carregando = ref(false)
  const carregandoDetalhe = ref(false)
  const publicando = ref(false)
  const reprovando = ref(false)
  const falhouConferencia = ref(false)

  const erroFila = ref('')
  const erroDetalhe = ref('')

  const versoesPublicadas = ref([])
  const versoes = ref([])
  const carregandoVersoes = ref(false)

  const feedback = criarFeedbackPublicacao()

  let consulta = null
  let consultaDetalhe = null
  let consultaVersoes = new AbortController()
  let destruido = false

  const ocupado = computed(() => carregando.value || publicando.value || reprovando.value)
  const enviando = computed(() => publicando.value || reprovando.value)

  const fila = computed(() =>
    versoes.value
      .filter((v) => v.situacao === 'RASCUNHO' || !v.situacao)
      .map(normalizarVersaoFila),
  )

  const versaoSelecionada = computed(() => {
    const id = versaoId.value.trim()
    return fila.value.find((item) => item.id === id) ?? null
  })

  const versaoConfirmada = computed(() =>
    versao.value?.id === versaoId.value.trim() ? versao.value : null,
  )

  function selecionarExecucao(valor) {
    if (enviando.value) return
    consulta?.abort()
    consulta = null

    carregando.value = false
    execucaoId.value = String(valor ?? '')
    resultado.value = null
    falhouConferencia.value = false
    feedback.registrarErro('conferencia', null)
  }

  function selecionarVersao(valor) {
    if (enviando.value) return
    versaoId.value = String(valor ?? '')
    versao.value = null
    motivoReprovacao.value = ''
    justificativa.value = ''
    feedback.registrarErro('publicacao', null)
  }

  async function consultar() {
    if (destruido || enviando.value || !execucaoId.value) return

    consulta?.abort()
    const atual = new AbortController()
    consulta = atual

    carregando.value = true
    resultado.value = null
    falhouConferencia.value = false
    feedback.registrarErro('conferencia', null)

    try {
      const dados = await publicacaoService.consultarQualidade(execucaoId.value, {
        signal: atual.signal,
      })
      if (destruido || atual.signal.aborted || consulta !== atual) return
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

  async function escolherVersao(id) {
    consultaDetalhe?.abort()
    selecionarVersao(id)
    detalhe.value = null
    erroDetalhe.value = ''

    const item = fila.value.find((v) => v.id === String(id))
    if (!item) {
      carregandoDetalhe.value = false
      return
    }

    const atual = new AbortController()
    consultaDetalhe = atual
    carregandoDetalhe.value = true

    try {
      const [detalheIndicadores] = await Promise.all([
        qualidadeIndicadoresService.carregarDetalhe(item, { signal: atual.signal }),
        item.execucaoId
          ? (selecionarExecucao(item.execucaoId), consultar())
          : Promise.resolve(),
      ])

      if (destruido || atual.signal.aborted || consultaDetalhe !== atual) return
      detalhe.value = detalheIndicadores
    } catch (erro) {
      if (
        destruido ||
        atual.signal.aborted ||
        consultaDetalhe !== atual ||
        requisicaoIndicadoresCancelada(erro)
      ) {
        return
      }
      erroDetalhe.value = erro.message || 'Erro ao carregar os detalhes da versão.'
    } finally {
      if (!destruido && consultaDetalhe === atual) {
        carregandoDetalhe.value = false
        consultaDetalhe = null
      }
    }
  }

  async function carregarVersoes() {
    if (destruido) return
    consultaVersoes.abort()
    consultaVersoes = new AbortController()

    carregandoVersoes.value = true
    erroFila.value = ''
    feedback.registrarErro('versoes', null)

    try {
      const dados = await publicacaoService.listarVersoes({
        signal: consultaVersoes.signal,
      })
      if (destruido) return

      versoes.value = dados
      versoesPublicadas.value = dados.filter((item) =>
        ['VIGENTE', 'ANTERIOR'].includes(item.situacao),
      )
    } catch (erro) {
      if (!destruido && !requisicaoPublicacaoCancelada(erro)) {
        erroFila.value = erro.message || 'Erro ao carregar as versões.'
        feedback.registrarErro('versoes', erro)
      }
    } finally {
      if (!destruido) carregandoVersoes.value = false
    }
  }

  async function carregarFila(manterEscolhida = true) {
    await carregarVersoes()
    if (erroFila.value) return

    const existe = fila.value.some((v) => v.id === versaoId.value)
    const proximaId =
      manterEscolhida && existe ? versaoId.value : (fila.value[0]?.id ?? null)

    if (proximaId !== versaoId.value || !detalhe.value) {
      await escolherVersao(proximaId)
    }
  }

  async function publicar() {
    if (destruido || ocupado.value || !versaoSelecionada.value) return

    feedback.registrarErro('publicacao', null)

    try {
      const alvo = versaoSelecionada.value
      const textoJustificativa = justificativa.value.trim()

      if (detalhe.value?.regrasQueFalharam?.some((r) => r.severidade === 'BLOQUEIA')) {
        throw new Error('Não é possível publicar uma versão com regras bloqueantes violadas.')
      }

      const qtdQuarentena =
        resultado.value?.registrosEmQuarentena ?? alvo.rejeitadas ?? 0

      if (qtdQuarentena > 0 && !textoJustificativa) {
        throw new Error('Informe a justificativa para publicar com registros em quarentena.')
      }

      const dados = prepararSolicitacaoPublicacao({
        resultado: resultado.value ?? { execucaoId: alvo.execucaoId },
        versao: alvo,
      })

      publicando.value = true

      const publicada = await publicacaoService.publicar(
        dados.versaoId,
        textoJustificativa,
      )

      if (destruido) return

      versao.value = publicada
      justificativa.value = ''

      feedback.notificar(
        'sucesso',
        'Publicação confirmada',
        `A versão #${publicada.numero} foi publicada com sucesso.`,
      )

      await carregarFila(false)
    } catch (erro) {
      if (!destruido) {
        feedback.registrarErro('publicacao', erro)
        feedback.notificar('erro', 'Falha na publicação', erro.message)
      }
    } finally {
      if (!destruido) publicando.value = false
    }
  }

  async function devolver() {
    if (destruido || ocupado.value || !versaoSelecionada.value) return

    feedback.registrarErro('publicacao', null)

    try {
      const id = validarIdPublicacao(versaoSelecionada.value.id)
      const motivo = justificativa.value.trim()

      if (versaoConfirmada.value && versaoConfirmada.value.situacao !== 'RASCUNHO') {
        throw new Error('Somente versões em rascunho podem ser devolvidas para correção.')
      }

      if (!motivo) {
        throw new Error('Informe o motivo na justificativa para devolver a versão.')
      }

      reprovando.value = true

      const resposta = await publicacaoService.reprovar(id, motivo)
      if (destruido) return

      versao.value = resposta
      justificativa.value = ''

      feedback.notificar(
        'aviso',
        'Versão devolvida',
        `A versão #${versaoSelecionada.value.numero} foi devolvida para correção.`,
      )

      await carregarFila(false)
    } catch (erro) {
      if (!destruido) {
        feedback.registrarErro('publicacao', erro)
        feedback.notificar('aviso', 'Atenção', erro.message)
      }
    } finally {
      if (!destruido) reprovando.value = false
    }
  }

  function obterRotaQuarentena() {
    const execId = versaoSelecionada.value?.execucaoId
    if (!execId) {
      feedback.notificar(
        'aviso',
        'Execução não identificada',
        'Não foi possível identificar a execução desta versão.',
      )
      return null
    }
    return { path: '/quarentena', query: { execucaoId: execId } }
  }

  function destruir() {
    destruido = true
    consulta?.abort()
    consultaDetalhe?.abort()
    consultaVersoes.abort()
  }

  return {
    fila,
    versaoSelecionada,
    detalhe,
    justificativa,
    carregandoFila: carregandoVersoes,
    carregandoDetalhe,
    enviando,
    erroFila,
    erroDetalhe,
    notificacoes: feedback.notificacoes,
    fecharNotificacao: feedback.fechar,
    carregarFila,
    escolherVersao,
    publicar,
    devolver,
    obterRotaQuarentena,
    destruir,
    fmt: formatarNumero,
    fmtData: formatarData,
  }
}

export default criarControleQualidade
