import { computed, ref, watch } from 'vue'
import { usuarioService, consultaUsuarioCancelada, mensagemErroUsuario, prepararConfirmacaoUsuario } from './usuarioService'

export function criarControleUsuarios(servico = usuarioService) {
  const usuarios = ref([])
  const perfis = ref([])
  const busca = ref('')
  const filtroPerfil = ref('')
  const filtroStatus = ref('')
  const pagina = ref(0)
  const totalItens = ref(0)
  const totalPaginas = ref(0)
  const resumo = ref(null)
  const carregando = ref(false)
  const carregandoPerfis = ref(false)
  const carregandoDetalhe = ref(false)
  const salvando = ref(false)
  const erroLista = ref('')
  const erroPerfis = ref('')
  const erroResumo = ref('')
  const erroFormulario = ref('')
  const feedback = ref('')
  const modalAberto = ref(false)
  const usuarioSelecionado = ref(null)
  const acaoPendente = ref(null)
  const erroAcao = ref('')
  const divergencias = ref([])
  const carregandoDivergencias = ref(false)
  const divergenciasConsultadas = ref(false)
  const erroDivergencias = ref('')
  let consultaLista, consultaPerfis, consultaDetalhe, consultaDivergencias, agendamento
  let destruido = false
  const ocupado = computed(() => salvando.value || carregandoDetalhe.value)
  const confirmacao = computed(() => acaoPendente.value ? prepararConfirmacaoUsuario(acaoPendente.value.tipo, acaoPendente.value.usuario) : null)
  const filtros = () => ({ busca: busca.value, perfilId: filtroPerfil.value, status: filtroStatus.value })

  async function carregar() {
    clearTimeout(agendamento)
    consultaLista?.abort()
    const atual = new AbortController()
    consultaLista = atual
    carregando.value = true
    erroLista.value = ''
    erroResumo.value = ''
    try {
      const [lista, contagens] = await Promise.allSettled([
        servico.listar({ ...filtros(), pagina: pagina.value }, { signal: atual.signal }),
        servico.resumo(filtros(), { signal: atual.signal }),
      ])
      if (destruido || atual.signal.aborted) return
      if (lista.status === 'fulfilled') {
        usuarios.value = lista.value.itens
        totalItens.value = lista.value.totalItens
        totalPaginas.value = lista.value.totalPaginas
        if (!lista.value.itens.length && pagina.value > 0) {
          pagina.value = Math.max(0, lista.value.totalPaginas - 1)
          return carregar()
        }
      } else {
        usuarios.value = []
        totalItens.value = 0
        totalPaginas.value = 0
        erroLista.value = mensagemErroUsuario(lista.reason)
      }
      resumo.value = contagens.status === 'fulfilled' ? contagens.value : null
      if (contagens.status === 'rejected') erroResumo.value = mensagemErroUsuario(contagens.reason)
    } finally {
      if (!destruido && consultaLista === atual) carregando.value = false
    }
  }

  async function carregarPerfis() {
    consultaPerfis?.abort()
    const atual = new AbortController()
    consultaPerfis = atual
    carregandoPerfis.value = true
    erroPerfis.value = ''
    try {
      const lista = await servico.perfis({ signal: atual.signal })
      if (!destruido && !atual.signal.aborted) perfis.value = lista
    } catch (erro) {
      if (!destruido && !atual.signal.aborted && !consultaUsuarioCancelada(erro)) erroPerfis.value = mensagemErroUsuario(erro)
    } finally {
      if (!destruido && consultaPerfis === atual) carregandoPerfis.value = false
    }
  }

  async function abrirModal(usuario = null) {
    if (ocupado.value || !perfis.value.length) return
    erroFormulario.value = ''
    feedback.value = ''
    usuarioSelecionado.value = null
    if (!usuario) { modalAberto.value = true; return }
    consultaDetalhe?.abort()
    const atual = new AbortController()
    consultaDetalhe = atual
    carregandoDetalhe.value = true
    try {
      const detalhe = await servico.detalhar(usuario.id, { signal: atual.signal })
      if (!destruido && !atual.signal.aborted) {
        usuarioSelecionado.value = detalhe
        modalAberto.value = true
      }
    } catch (erro) {
      if (!destruido && !atual.signal.aborted && !consultaUsuarioCancelada(erro)) feedback.value = mensagemErroUsuario(erro)
    } finally {
      if (!destruido && consultaDetalhe === atual) carregandoDetalhe.value = false
    }
  }

  async function salvarUsuario(dados) {
    if (salvando.value) return
    salvando.value = true
    erroFormulario.value = ''
    try {
      const editando = usuarioSelecionado.value != null
      const usuario = await servico.salvar(dados, perfis.value, usuarioSelecionado.value)
      if (destruido) return
      modalAberto.value = false
      feedback.value = usuario.avisoEnvioEmail || `${usuario.nome}: ${editando ? 'cadastro atualizado' : 'usuário cadastrado e convite solicitado'}.`
      await carregar()
      if (divergenciasConsultadas.value) await consultarDivergencias()
    } catch (erro) {
      if (!destruido) erroFormulario.value = mensagemErroUsuario(erro, true)
    } finally {
      if (!destruido) salvando.value = false
    }
  }

  function solicitarAcao(tipo, usuario) {
    if (ocupado.value) return
    erroAcao.value = ''
    acaoPendente.value = { tipo, usuario }
  }
  function cancelarAcao() { if (!salvando.value) acaoPendente.value = null }
  async function confirmarAcao() {
    if (salvando.value || !acaoPendente.value) return
    const { tipo, usuario } = acaoPendente.value
    salvando.value = true
    erroAcao.value = ''
    try {
      const confirmado = tipo === 'convite' ? await servico.reenviarConvite(usuario) : await servico.alterarStatus(usuario)
      if (destruido) return
      acaoPendente.value = null
      feedback.value = confirmado.avisoEnvioEmail || (tipo === 'convite' ? `${confirmado.nome}: convite reenviado.` : `${confirmado.nome}: acesso ${confirmado.ativo ? 'reativado' : 'desativado'}.`)
      await carregar()
      if (divergenciasConsultadas.value) await consultarDivergencias()
    } catch (erro) {
      if (!destruido) erroAcao.value = mensagemErroUsuario(erro, true)
    } finally {
      if (!destruido) salvando.value = false
    }
  }

  async function consultarDivergencias() {
    consultaDivergencias?.abort()
    const atual = new AbortController()
    consultaDivergencias = atual
    carregandoDivergencias.value = true
    erroDivergencias.value = ''
    try {
      const lista = await servico.divergencias({ signal: atual.signal })
      if (!destruido && !atual.signal.aborted) {
        divergencias.value = lista
        divergenciasConsultadas.value = true
      }
    } catch (erro) {
      if (!destruido && !atual.signal.aborted && !consultaUsuarioCancelada(erro)) {
        divergencias.value = []
        divergenciasConsultadas.value = false
        erroDivergencias.value = mensagemErroUsuario(erro)
      }
    } finally {
      if (!destruido && consultaDivergencias === atual) carregandoDivergencias.value = false
    }
  }

  const pararFiltros = watch([busca, filtroPerfil, filtroStatus], () => {
    consultaLista?.abort()
    pagina.value = 0
    usuarios.value = []
    resumo.value = null
    carregando.value = true
    clearTimeout(agendamento)
    agendamento = setTimeout(carregar, 300)
  })
  function mudarPagina(valor) {
    if (carregando.value || ocupado.value || !Number.isSafeInteger(valor) || valor < 0 || valor >= totalPaginas.value) return
    pagina.value = valor
    return carregar()
  }
  function destruir() {
    destruido = true
    pararFiltros()
    clearTimeout(agendamento)
    for (const consulta of [consultaLista, consultaPerfis, consultaDetalhe, consultaDivergencias]) consulta?.abort()
  }
  return { usuarios, perfis, busca, filtroPerfil, filtroStatus, pagina, totalItens, totalPaginas, resumo,
    carregando, carregandoPerfis, carregandoDetalhe, salvando, ocupado, erroLista, erroPerfis, erroResumo, erroFormulario,
    feedback, modalAberto, usuarioSelecionado, confirmacao, erroAcao, divergencias, carregandoDivergencias,
    divergenciasConsultadas, erroDivergencias, carregar, carregarPerfis, abrirModal, salvarUsuario, solicitarAcao,
    cancelarAcao, confirmarAcao, consultarDivergencias, mudarPagina, destruir,
    iniciar() { return Promise.all([carregar(), carregarPerfis()]) },
  }
}
