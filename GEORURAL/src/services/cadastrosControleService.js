import { ref } from 'vue'
import { fonteService } from './fonteService'
import { conjuntoService } from './conjuntoService'
import { criarFluxoConjuntoUpload } from './conjuntoUploadService'
import { mensagemErroCadastro } from './cadastroService'

export function criarControleCadastros() {
  const fontes = ref([])
  const conjuntos = ref([])

  const carregando = ref(false)
  const carregandoConjuntos = ref(false)

  const erro = ref('')
  const erroConjuntos = ref('')

  const salvandoFonte = ref(false)
  const salvandoConjunto = ref(false)

  const erroSalvarFonte = ref('')
  const erroSalvarConjunto = ref('')

  const alterandoStatus = ref(false)
  const erroAlterarStatus = ref('')

  const feedback = ref(null)
  const conjuntoPersistido = ref(null)
  const arquivosConjuntoPendentes = ref(null)
  const fluxoConjunto = criarFluxoConjuntoUpload((registro) => {
    if (!destruido) {
      substituir(conjuntos, registro)
      conjuntoPersistido.value = registro
    }
  })

  let leituraFontes = null
  let leituraConjuntos = null
  let destruido = false
  let sequencia = 0

  function notificar(mensagem, tipo = 'sucesso') {
    feedback.value = {
      id: ++sequencia,
      mensagem,
      tipo,
    }
  }

  function substituir(lista, item) {
    const indice = lista.value.findIndex(
      (atual) => String(atual.id) === String(item.id),
    )

    if (indice === -1) {
      lista.value.push(item)
    } else {
      lista.value.splice(indice, 1, item)
    }
  }

  async function ler(
    service,
    lista,
    ocupado,
    falha,
    tipo,
  ) {
    if (destruido) return

    if (tipo === 'fontes') {
      leituraFontes?.abort()
    } else {
      leituraConjuntos?.abort()
    }

    const controle = new AbortController()

    if (tipo === 'fontes') {
      leituraFontes = controle
    } else {
      leituraConjuntos = controle
    }

    ocupado.value = true
    falha.value = ''

    try {
      const dados = await service.listar({
        signal: controle.signal,
      })

      if (!destruido && !controle.signal.aborted) {
        lista.value = dados
      }
    } catch (erroConsulta) {
      if (!destruido && !controle.signal.aborted) {
        falha.value = mensagemErroCadastro(erroConsulta)
      }
    } finally {
      const consultaAtual = tipo === 'fontes'
        ? leituraFontes
        : leituraConjuntos

      if (!destruido && consultaAtual === controle) {
        ocupado.value = false
      }
    }
  }

  function carregarFontes() {
    return ler(
      fonteService,
      fontes,
      carregando,
      erro,
      'fontes',
    )
  }

  function carregarConjuntos() {
    return ler(
      conjuntoService,
      conjuntos,
      carregandoConjuntos,
      erroConjuntos,
      'conjuntos',
    )
  }

  async function salvar(
    service,
    lista,
    ocupado,
    falha,
    dados,
    nome,
  ) {
    if (
      destruido ||
      ocupado.value ||
      alterandoStatus.value
    ) {
      return false
    }

    ocupado.value = true
    falha.value = ''

    try {
      const registro = await service.salvar(dados)

      if (destruido) return false

      substituir(lista, registro)

      const acao = dados.id == null
        ? 'cadastrad'
        : 'atualizad'

      const terminacao = nome === 'Fonte' ? 'a' : 'o'

      notificar(
        `${nome} ${acao}${terminacao} com sucesso.`,
      )

      return true
    } catch (erroSalvar) {
      if (!destruido) {
        falha.value = mensagemErroCadastro(erroSalvar)
        notificar(falha.value, 'erro')
      }

      return false
    } finally {
      ocupado.value = false
    }
  }

  function salvarFonte(dados) {
    return salvar(
      fonteService,
      fontes,
      salvandoFonte,
      erroSalvarFonte,
      dados,
      'Fonte',
    )
  }

  async function salvarConjunto(dados) {
    if (destruido || salvandoConjunto.value || salvandoFonte.value || alterandoStatus.value) return false
    salvandoConjunto.value = true
    erroSalvarConjunto.value = ''
    try {
      const resultado = await fluxoConjunto.salvar(dados)
      if (destruido) return false
      const mensagem = resultado.quantidade
        ? `Conjunto salvo e ${resultado.quantidade} arquivo(s) enviado(s) com sucesso.`
        : 'Conjunto salvo com sucesso.'
      notificar(mensagem)
      return true
    } catch (erroSalvar) {
      if (!destruido) {
        if (erroSalvar.registro) {
          arquivosConjuntoPendentes.value = erroSalvar.arquivosPendentes
          erroSalvarConjunto.value = `${erroSalvar.message} ${mensagemErroCadastro(erroSalvar.cause)} Ao tentar novamente, o cadastro existente será atualizado.`
        } else {
          erroSalvarConjunto.value = mensagemErroCadastro(erroSalvar)
        }
        notificar(erroSalvarConjunto.value, 'erro')
      }
      return false
    } finally {
      salvandoConjunto.value = false
    }
  }

  async function alterar(
    service,
    lista,
    registro,
    nome,
  ) {
    if (
      destruido ||
      alterandoStatus.value ||
      salvandoFonte.value ||
      salvandoConjunto.value
    ) {
      return false
    }

    alterandoStatus.value = true
    erroAlterarStatus.value = ''

    try {
      const atualizado = await service.alterarStatus(
        registro,
      )

      if (destruido) return false

      substituir(lista, atualizado)

      const acao = registro.ativo
        ? 'desativad'
        : 'reativad'

      const terminacao = nome === 'Fonte' ? 'a' : 'o'

      notificar(
        `${nome} ${acao}${terminacao} com sucesso.`,
      )

      return true
    } catch (erroStatus) {
      if (!destruido) {
        erroAlterarStatus.value =
          mensagemErroCadastro(erroStatus)

        notificar(erroAlterarStatus.value, 'erro')
      }

      return false
    } finally {
      alterandoStatus.value = false
    }
  }

  function destruir() {
    destruido = true
    leituraFontes?.abort()
    leituraConjuntos?.abort()
  }

  return {
    fontes,
    conjuntos,
    carregando,
    carregandoConjuntos,
    erro,
    erroConjuntos,
    salvandoFonte,
    salvandoConjunto,
    erroSalvarFonte,
    erroSalvarConjunto,
    alterandoStatus,
    erroAlterarStatus,
    feedback,
    conjuntoPersistido,
    arquivosConjuntoPendentes,
    carregarFontes,
    carregarConjuntos,
    salvarFonte,
    salvarConjunto,

    alterarStatusFonte: (fonte) =>
      alterar(fonteService, fontes, fonte, 'Fonte'),

    alterarStatusConjunto: (conjunto) =>
      alterar(
        conjuntoService,
        conjuntos,
        conjunto,
        'Conjunto',
      ),

    limparErroFonte: () => {
      erroSalvarFonte.value = ''
    },

    limparErroConjunto: () => {
      erroSalvarConjunto.value = ''
      conjuntoPersistido.value = null
      arquivosConjuntoPendentes.value = null
      fluxoConjunto.limpar()
    },

    destruir,
  }
}
