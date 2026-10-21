import { ref } from 'vue'

import {
  quarentenaService,
  requisicaoQuarentenaCancelada,
  validarIdQuarentena,
} from './quarentenaService'

function texto(valor) {
  if (
    typeof valor === 'string' ||
    typeof valor === 'number'
  ) {
    return String(valor).trim()
  }

  return ''
}

function extrairLista(resposta) {
  return Array.isArray(resposta)
    ? resposta
    : resposta.content
}

function prepararExecucoes(lista) {
  return lista.map(item => {
    if (
      !item ||
      typeof item !== 'object' ||
      Array.isArray(item)
    ) {
      throw new Error(
        'A listagem contém uma execução inválida.',
      )
    }

    const id = validarIdQuarentena(
      item.id ?? item.execucaoId,
    )

    const nome = texto(
      item.nomeArquivo ??
      item.arquivo?.nomeOriginal ??
      item.arquivo?.nome ??
      item.conjuntoNome ??
      item.conjunto?.nome,
    )

    return {
      id,
      nome: nome
        ? `Execução ${id} — ${nome}`
        : `Execução ${id}`,
    }
  })
}

function prepararRegistros(lista) {
  return lista.map((item, indice) => {
    if (
      !item ||
      typeof item !== 'object' ||
      Array.isArray(item)
    ) {
      throw new Error(
        'A listagem contém um registro de quarentena inválido.',
      )
    }

    const id = item.id ?? item.quarentenaId ?? null

    return {
      chave: `${id ?? 'registro'}-${indice}`,
      id,
      linha: texto(
        item.linhaOrigem ?? item.linha,
      ) || 'Não informada',
      identificador: texto(
        item.identificador ??
        item.identificadorRegistro,
      ) || 'Não informado',
      tipo: texto(
        item.tipoRegra ??
        item.tipo ??
        item.regra?.tipo,
      ) || 'Não informado',
      campo: texto(
        item.colunaErro ?? item.campo,
      ) || 'Não informado',
      motivo: texto(
        item.motivoErro ?? item.motivo,
      ) || 'Não informado',
      situacao: texto(
        item.situacao ?? item.status,
      ) || 'Não informada',
      original: item,
    }
  })
}

export function criarConsultaQuarentena() {
  const execucoes = ref([])
  const execucaoId = ref('')
  const registros = ref([])

  const carregandoExecucoes = ref(false)
  const carregandoRegistros = ref(false)

  const falhouExecucoes = ref(false)
  const falhouRegistros = ref(false)
  const consultado = ref(false)

  const mensagem = ref('')
  const listaParcial = ref(false)

  let consultaExecucoes = null
  let consultaRegistros = null
  let destruido = false

  function limparRegistros() {
    consultaRegistros?.abort()
    consultaRegistros = null

    registros.value = []
    carregandoRegistros.value = false
    falhouRegistros.value = false
    consultado.value = false
    listaParcial.value = false
  }

  async function carregarExecucoes() {
    if (destruido) return

    consultaExecucoes?.abort()
    limparRegistros()

    const atual = new AbortController()
    consultaExecucoes = atual

    execucoes.value = []
    execucaoId.value = ''
    mensagem.value = ''

    carregandoExecucoes.value = true
    falhouExecucoes.value = false

    try {
      const resposta =
        await quarentenaService.listarExecucoes(
          {},
          { signal: atual.signal },
        )

      if (
        destruido ||
        atual.signal.aborted ||
        consultaExecucoes !== atual
      ) {
        return
      }

      execucoes.value = prepararExecucoes(
        extrairLista(resposta),
      )
    } catch (erro) {
      if (
        destruido ||
        atual.signal.aborted ||
        consultaExecucoes !== atual ||
        requisicaoQuarentenaCancelada(erro)
      ) {
        return
      }

      falhouExecucoes.value = true
      mensagem.value = erro.message
    } finally {
      if (
        !destruido &&
        consultaExecucoes === atual
      ) {
        carregandoExecucoes.value = false
        consultaExecucoes = null
      }
    }
  }

  async function selecionarExecucao(valor) {
    if (destruido) return

    limparRegistros()

    execucaoId.value = String(valor ?? '')
    mensagem.value = ''

    if (!execucaoId.value) return

    const atual = new AbortController()
    consultaRegistros = atual
    carregandoRegistros.value = true

    try {
      const resposta =
        await quarentenaService.listarRegistros(
          execucaoId.value,
          {},
          { signal: atual.signal },
        )

      if (
        destruido ||
        atual.signal.aborted ||
        consultaRegistros !== atual
      ) {
        return
      }

      const lista = extrairLista(resposta)

      registros.value = prepararRegistros(lista)

      listaParcial.value =
        !Array.isArray(resposta) &&
        Number.isSafeInteger(resposta.totalElements) &&
        resposta.totalElements > lista.length

      consultado.value = true
    } catch (erro) {
      if (
        destruido ||
        atual.signal.aborted ||
        consultaRegistros !== atual ||
        requisicaoQuarentenaCancelada(erro)
      ) {
        return
      }

      falhouRegistros.value = true
      mensagem.value = erro.message
    } finally {
      if (
        !destruido &&
        consultaRegistros === atual
      ) {
        carregandoRegistros.value = false
        consultaRegistros = null
      }
    }
  }

  function tentarRegistrosNovamente() {
    return selecionarExecucao(execucaoId.value)
  }

  function fecharMensagem() {
    mensagem.value = ''
  }

  function destruir() {
    destruido = true

    consultaExecucoes?.abort()
    consultaRegistros?.abort()
  }

  return {
    execucoes,
    execucaoId,
    registros,
    carregandoExecucoes,
    carregandoRegistros,
    falhouExecucoes,
    falhouRegistros,
    consultado,
    mensagem,
    listaParcial,
    carregarExecucoes,
    selecionarExecucao,
    tentarRegistrosNovamente,
    fecharMensagem,
    destruir,
  }
}
