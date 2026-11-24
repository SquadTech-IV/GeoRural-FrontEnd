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
  // VersaoResumoResponse ja traz sigla e nome de cada indicador da versao; a tela
  // nunca usava. E o que diz, de relance, se a versao tem algo para publicar.
  const indicadores = Array.isArray(v.indicadores) ? v.indicadores : []
  const rejeitadas = Number(v.registrosEmQuarentena ?? v.rejeitadas ?? 0)
  const aprovadas = Number(v.registrosAprovados ?? v.aprovadas ?? 0)
  const automatica = Boolean(v.automatica ?? v.dagRunId)

  return {
    ...v,
    indicadores,
    siglas: indicadores.map((i) => i?.sigla).filter(Boolean),
    id: String(v.id),
    numero: v.numero ?? v.id,
    // Os nomes vinham errados e caiam todos no valor padrao: o back manda conjuntoNome,
    // dataCriacao, arquivoNome e responsavel -- nao nomeConjunto, criadoEm, nomeArquivo
    // nem autor. Era por isso que a linha saia como "— · gerada em — · Operador".
    conjunto: v.conjunto ?? v.conjuntoNome ?? v.nomeConjunto ?? 'Conjunto principal',
    automatica,
    arquivo: v.arquivo ?? v.arquivoNome ?? v.nomeArquivo ?? '—',
    geradaEm: v.geradaEm ?? v.dataCriacao ?? v.criadoEm ?? null,
    quem: v.quem ?? v.responsavel ?? v.autor ?? (automatica ? 'Airflow' : 'Operador'),
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

  // filtro OPCIONAL, desligado por padrao: esconder versao sem indicador tambem
  // esconderia a rodada que falhou em calcular, que e justamente a que precisa de olho.
  const apenasComIndicador = ref(false)
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

  const filaCompleta = computed(() =>
    versoes.value
      .filter((v) => v.situacao === 'RASCUNHO' || !v.situacao)
      .map(normalizarVersaoFila)
      // Da mais antiga para a mais nova. Publicando de cima para baixo, a ultima a ser
      // publicada e a mais nova -- que e o estado correto. Na ordem inversa, publicar a
      // fila inteira deixava a versao MAIS VELHA como oficial.
      .sort((a, b) => Number(a.numero ?? 0) - Number(b.numero ?? 0)),
  )

  const fila = computed(() =>
    apenasComIndicador.value
      ? filaCompleta.value.filter((v) => v.siglas.length > 0)
      : filaCompleta.value,
  )

  const semIndicador = computed(
    () => filaCompleta.value.filter((v) => v.siglas.length === 0).length,
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
      // allSettled, nao all: o painel de indicadores e a conferencia de qualidade sao
      // independentes. Com Promise.all a falha de um descartava o resultado do outro.
      const [indicadores] = await Promise.allSettled([
        qualidadeIndicadoresService.carregarDetalhe(item, { signal: atual.signal }),
        item.execucaoId
          ? (selecionarExecucao(item.execucaoId), consultar())
          : Promise.resolve(),
      ])

      if (destruido || atual.signal.aborted || consultaDetalhe !== atual) return

      if (indicadores.status === 'fulfilled') {
        detalhe.value = indicadores.value
      } else if (!requisicaoIndicadoresCancelada(indicadores.reason)) {
        detalhe.value = null
        erroDetalhe.value = indicadores.reason?.message
          || 'Erro ao carregar os detalhes da versão.'
      }
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

      // A fonte das regras e o relatorio de qualidade, nao o painel de indicadores.
      // O back manda todas as avaliadas com o campo "aprovada": filtra pelas que
      // falharam, senao regra bloqueante que PASSOU impediria a publicacao.
      const bloqueantes = [
        ...(resultado.value?.regras ?? []).filter((r) => r.aprovada !== true),
        ...(detalhe.value?.regrasQueFalharam ?? []),
      ].filter((r) => r?.severidade === 'BLOQUEIA')

      if (bloqueantes.length > 0) {
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
    semIndicador,
    apenasComIndicador,
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