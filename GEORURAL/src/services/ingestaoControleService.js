import {
  computed,
  ref,
} from 'vue'

import { fonteService } from './fonteService'
import { conjuntoService } from './conjuntoService'

import {
  mensagemErroIngestao,
  consultaIngestaoCancelada,
} from './ingestaoService'

export function criarControleIngestao() {
  const fontes = ref([])
  const conjuntos = ref([])

  const carregando = ref(false)
  const falhou = ref(false)
  const mensagem = ref('')

  const configuracao = ref(null)
  const consultaApi = ref(null)
  const itensSelecionados = ref([])

  let consulta = null
  let destruido = false

  const fonteConfigurada = computed(() =>
    fontes.value.find(
      item =>
        String(item.id) ===
        String(configuracao.value?.fonteId),
    ) ?? null,
  )

  const conjuntoConfigurado = computed(() =>
    conjuntos.value.find(
      item =>
        String(item.id) ===
        String(configuracao.value?.conjuntoId),
    ) ?? null,
  )

  function exibirErro(erro) {
    if (
      destruido ||
      consultaIngestaoCancelada(erro)
    ) {
      return
    }

    mensagem.value = mensagemErroIngestao(erro)
  }

  async function carregar() {
    if (destruido) return

    consulta?.abort()

    const atual = new AbortController()
    consulta = atual

    carregando.value = true
    falhou.value = false
    mensagem.value = ''

    fontes.value = []
    conjuntos.value = []
    configuracao.value = null
    consultaApi.value = null
    itensSelecionados.value = []

    try {
      const [
        listaFontes,
        listaConjuntos,
      ] = await Promise.all([
        fonteService.listar({
          signal: atual.signal,
        }),
        conjuntoService.listar({
          signal: atual.signal,
        }),
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
        carregando.value = false
        consulta = null
      }
    }
  }

  function receberConfiguracao(dados) {
    if (destruido || carregando.value) return

    try {
      const fonte = fontes.value.find(
        item =>
          item.ativo &&
          String(item.id) ===
            String(dados?.fonteId),
      )

      const conjunto = conjuntos.value.find(
        item =>
          item.ativo &&
          String(item.id) ===
            String(dados?.conjuntoId) &&
          String(item.fonteId) ===
            String(fonte?.id),
      )

      if (!fonte || !conjunto) {
        throw new Error(
          'Selecione uma fonte e um conjunto ativos.',
        )
      }

      if (
        !['upload', 'api'].includes(dados.metodo)
      ) {
        throw new Error(
          'Selecione uma forma de entrada válida.',
        )
      }

      if (
        dados.metodo === 'upload' &&
        !conjunto.upload
      ) {
        throw new Error(
          'Este conjunto não permite upload.',
        )
      }

      if (
        dados.metodo === 'api' &&
        !conjunto.api
      ) {
        throw new Error(
          'Este conjunto não permite entrada por API.',
        )
      }

      if (
        dados.metodo === 'upload' &&
        !(dados.arquivo instanceof File)
      ) {
        throw new Error(
          'Selecione um arquivo para continuar.',
        )
      }

      configuracao.value = { ...dados }
    } catch (erro) {
      configuracao.value = null
      exibirErro(erro)
    }
  }

  function receberConsultaApi(dados) {
    consultaApi.value = dados
  }

  function receberSelecaoApi(itens) {
    itensSelecionados.value = Array.isArray(itens)
      ? [...itens]
      : []
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
    falhou,
    mensagem,
    configuracao,
    fonteConfigurada,
    conjuntoConfigurado,
    consultaApi,
    itensSelecionados,
    carregar,
    receberConfiguracao,
    receberConsultaApi,
    receberSelecaoApi,
    exibirErro,
    fecharMensagem,
    destruir,
  }
}
