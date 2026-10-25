import { computed, ref } from 'vue'

import { fonteService } from './fonteService'
import { conjuntoService } from './conjuntoService'

import {
  ingestaoService,
  mensagemErroIngestao,
  consultaIngestaoCancelada,
} from './ingestaoService'

export function criarControleIngestao() {
  const fontes = ref([])
  const conjuntos = ref([])

  const carregandoListas = ref(false)
  const enviando = ref(false)
  const falhou = ref(false)

  const mensagem = ref('')
  const tipoMensagem = ref('erro')

  const configuracao = ref(null)
  const resultado = ref(null)
  const consultaApi = ref(null)
  const itensSelecionados = ref([])
  const chaveFormulario = ref(0)

  let consulta = null
  let destruido = false

  const carregando = computed(() =>
    carregandoListas.value || enviando.value,
  )

  const fonteConfigurada = computed(() =>
    fontes.value.find(item =>
      String(item.id) === String(configuracao.value?.fonteId),
    ) ?? null,
  )

  const conjuntoConfigurado = computed(() =>
    conjuntos.value.find(item =>
      String(item.id) === String(configuracao.value?.conjuntoId),
    ) ?? null,
  )

  function notificar(tipo, texto) {
    if (destruido) return
    tipoMensagem.value = tipo
    mensagem.value = texto
  }

  function exibirErro(erro) {
    if (destruido || consultaIngestaoCancelada(erro)) return

    notificar('erro', mensagemErroIngestao(erro))
  }

  function receberConsultaApi(dados) {
    if (destruido) return

    consultaApi.value = dados
    itensSelecionados.value = []
  }

  function receberSelecaoApi(itens) {
    if (destruido) return

    itensSelecionados.value =
      Array.isArray(itens) ? [...itens] : []
  }

  function limparResultado() {
    if (enviando.value) return

    configuracao.value = null
    resultado.value = null
    consultaApi.value = null
    itensSelecionados.value = []
  }

  async function carregar() {
    if (destruido || enviando.value) return

    consulta?.abort()

    const atual = new AbortController()
    consulta = atual

    carregandoListas.value = true
    falhou.value = false
    mensagem.value = ''

    fontes.value = []
    conjuntos.value = []
    limparResultado()

    try {
      const [listaFontes, listaConjuntos] = await Promise.all([
        fonteService.listar({ signal: atual.signal }),
        conjuntoService.listar({ signal: atual.signal }),
      ])

      if (
        destruido ||
        atual.signal.aborted ||
        consulta !== atual
      ) {
        return
      }

      fontes.value = listaFontes
      conjuntos.value = listaConjuntos
    } catch (erro) {
      if (
        destruido ||
        atual.signal.aborted ||
        consulta !== atual ||
        consultaIngestaoCancelada(erro)
      ) {
        return
      }

      atual.abort()
      falhou.value = true
      exibirErro(erro)
    } finally {
      if (!destruido && consulta === atual) {
        carregandoListas.value = false
        consulta = null
      }
    }
  }

  async function receberConfiguracao(dados) {
    if (destruido || carregando.value) return

    mensagem.value = ''
    resultado.value = null
    configuracao.value = null

    try {
      const fonte = fontes.value.find(item =>
        item.ativo &&
        String(item.id) === String(dados?.fonteId),
      )

      const conjunto = conjuntos.value.find(item =>
        item.ativo &&
        String(item.id) === String(dados?.conjuntoId) &&
        String(item.fonteId) === String(fonte?.id),
      )

      if (!fonte || !conjunto) {
        throw new Error('Selecione uma fonte e um conjunto ativos.')
      }

      if (!['upload', 'api'].includes(dados.metodo)) {
        throw new Error('Selecione uma forma de entrada válida.')
      }

      if (
        (dados.metodo === 'upload' && !conjunto.upload) ||
        (dados.metodo === 'api' && !conjunto.api)
      ) {
        throw new Error('O conjunto não permite esta forma de entrada.')
      }

      let identificadores = []

      if (dados.metodo === 'api') {
        if (
          String(consultaApi.value?.conjuntoId) !==
          String(conjunto.id)
        ) {
          throw new Error('Consulte a disponibilidade deste conjunto primeiro.')
        }

        const disponiveis = consultaApi.value.resposta

        identificadores = itensSelecionados.value.map(item =>
          item.identificador,
        )

        if (
          !Array.isArray(disponiveis) ||
          !identificadores.length ||
          identificadores.some(id =>
            !disponiveis.some(item =>
              item.identificador === id && !item.jaRecebido,
            ),
          )
        ) {
          throw new Error('Selecione itens disponíveis para importar.')
        }
      }

      enviando.value = true

      const resposta = dados.metodo === 'upload'
        ? await ingestaoService.enviarUpload(
            conjunto.id,
            dados.arquivo,
          )
        : await ingestaoService.importar(
            conjunto.id,
            identificadores,
          )

      if (destruido) return

      configuracao.value = { ...dados }
      resultado.value = resposta

      if (dados.metodo === 'upload') {
        const item = resposta[0]

        if (item.aceito) {
          notificar('sucesso', 'Arquivo recebido pelo servidor.')
        } else {
          notificar(
            'aviso',
            'O servidor recusou o arquivo. Confira o formato e o conteúdo.',
          )
        }
      } else {
        const falhas = resposta.itens
          .filter(item => item.status === 'FALHA')
          .map(item => `${item.nome || item.identificador}: ${item.mensagem}`)

        const resumo =
          `${resposta.importados} importado(s), ` +
          `${resposta.jaRecebidos} já recebido(s) e ` +
          `${resposta.falhas} falha(s).`

        notificar(
          resposta.falhas > 0 ? 'aviso' : 'sucesso',
          [resumo, ...falhas].join(' '),
        )
      }

      consultaApi.value = null
      itensSelecionados.value = []
      chaveFormulario.value++
    } catch (erro) {
      if (!destruido && !consultaIngestaoCancelada(erro)) {
        notificar('erro', mensagemErroIngestao(erro, enviando.value))
      }
    } finally {
      if (!destruido) enviando.value = false
    }
  }

  function fecharMensagem() {
    mensagem.value = ''
  }

  function destruir() {
    destruido = true
    consulta?.abort()
  }

  return {
    fontes,
    conjuntos,
    carregando,
    enviando,
    falhou,
    mensagem,
    tipoMensagem,
    configuracao,
    resultado,
    fonteConfigurada,
    conjuntoConfigurado,
    consultaApi,
    itensSelecionados,
    chaveFormulario,
    carregar,
    receberConfiguracao,
    receberConsultaApi,
    receberSelecaoApi,
    limparResultado,
    exibirErro,
    fecharMensagem,
    destruir,
  }
}
