import { computed, ref } from 'vue'
import { identificadorOriginal } from './quarentenaDadosService'

import {
  quarentenaService,
  requisicaoQuarentenaCancelada,
  validarIdQuarentena,
} from './quarentenaService'

function texto(valor) {
  if (typeof valor === 'string' || typeof valor === 'number') {
    return String(valor).trim()
  }

  return ''
}

function normalizar(valor) {
  return texto(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
}

function extrairLista(resposta) {
  return Array.isArray(resposta) ? resposta : resposta.content
}

function prepararExecucoes(lista) {
  return lista.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('A listagem contém uma execução inválida.')
    }

    const id = validarIdQuarentena(item.id ?? item.execucaoId)

    const nome = texto(
      item.nomeArquivoBruto ??
      item.nomeArquivo ??
      item.arquivo?.nomeOriginal ??
      item.arquivo?.nome ??
      item.nomeConjunto ??
      item.conjuntoNome ??
      item.conjunto?.nome,
    )

    return {
      id,
      nome: nome ? `Execução ${id} — ${nome}` : `Execução ${id}`,
    }
  })
}

function prepararRegistros(lista) {
  return lista.map((item, indice) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(
        'A listagem contém um registro de quarentena inválido.',
      )
    }

    const id = item.id ?? item.quarentenaId ?? null
    const linhaRecebida = item.linhaOrigem ?? item.linha
    const linhaTexto = texto(linhaRecebida)

    const linhaNumerica =
      /^\d+$/.test(linhaTexto) &&
      Number.isSafeInteger(Number(linhaTexto))
        ? Number(linhaTexto)
        : null

    return {
      chave: `${id ?? 'registro'}-${indice}`,
      id,
      linha: linhaTexto || 'Não informada',
      linhaNumerica,
      identificador:
        texto(
          item.identificador ??
          item.identificadorRegistro ??
          identificadorOriginal(item),
        ) || 'Não informado',
      tipo:
        texto(
          item.codigoRegra ??
          item.tipoRegra ??
          item.tipo ??
          item.regra?.tipo,
        ) || 'Não informado',
      campo: texto(item.colunaErro ?? item.campo) || 'Não informado',
      motivo: texto(item.motivoErro ?? item.motivo) || 'Não informado',
      situacao: texto(item.situacao ?? item.status) || 'Não informada',
      original: item,
    }
  })
}

export function criarConsultaQuarentena() {
  const execucoes = ref([])
  const execucaoId = ref('')
  const registros = ref([])

  const busca = ref('')
  const tipoSelecionado = ref('')
  const ordenacao = ref('linha')

  const carregandoExecucoes = ref(false)
  const carregandoRegistros = ref(false)

  const falhouExecucoes = ref(false)
  const falhouRegistros = ref(false)
  const consultado = ref(false)

  const mensagem = ref('')
  const listaParcial = ref(false)

  const paginaExecucoes = ref(0)
  const totalPaginasExecucoes = ref(0)
  const totalExecucoes = ref(0)

  const paginaRegistros = ref(0)
  const totalPaginasRegistros = ref(0)
  const totalRegistros = ref(0)

  let consultaExecucoes = null
  let consultaRegistros = null
  let destruido = false

  const tiposDisponiveis = computed(() => {
    const tipos = new Map()

    for (const registro of registros.value) {
      const valor = normalizar(registro.tipo)

      if (!tipos.has(valor)) {
        tipos.set(valor, {
          valor,
          nome: registro.tipo,
          quantidade: 0,
        })
      }

      tipos.get(valor).quantidade++
    }

    return [...tipos.values()].sort((a, b) =>
      a.nome.localeCompare(b.nome, 'pt-BR'),
    )
  })

  const filtrosAtivos = computed(() =>
    Boolean(
      busca.value.trim() ||
      tipoSelecionado.value ||
      ordenacao.value !== 'linha',
    ),
  )

  const registrosFiltrados = computed(() => {
    const termo = normalizar(busca.value)

    const filtrados = registros.value.filter(registro => {
      if (
        tipoSelecionado.value &&
        normalizar(registro.tipo) !== tipoSelecionado.value
      ) {
        return false
      }

      if (!termo) return true

      const conteudo = [
        registro.linha,
        registro.identificador,
        registro.tipo,
        registro.campo,
        registro.motivo,
        registro.situacao,
      ]
        .map(normalizar)
        .join(' ')

      return conteudo.includes(termo)
    })

    return filtrados.sort((a, b) => {
      if (ordenacao.value === 'motivo') {
        return (
          a.motivo.localeCompare(b.motivo, 'pt-BR') ||
          compararLinha(a, b)
        )
      }

      if (ordenacao.value === 'linha_desc') {
        return compararLinha(a, b, true)
      }

      return compararLinha(a, b)
    })
  })

  function compararLinha(a, b, decrescente = false) {
    if (a.linhaNumerica === null && b.linhaNumerica === null) {
      return 0
    }

    if (a.linhaNumerica === null) return 1
    if (b.linhaNumerica === null) return -1

    return decrescente
      ? b.linhaNumerica - a.linhaNumerica
      : a.linhaNumerica - b.linhaNumerica
  }

  function limparFiltros() {
    busca.value = ''
    tipoSelecionado.value = ''
    ordenacao.value = 'linha'
  }

  function limparRegistros() {
    consultaRegistros?.abort()
    consultaRegistros = null

    registros.value = []
    carregandoRegistros.value = false
    falhouRegistros.value = false
    consultado.value = false
    listaParcial.value = false
    totalPaginasRegistros.value = 0
    totalRegistros.value = 0
  }

  async function carregarExecucoes(pagina = 0) {
    if (destruido) return

    consultaExecucoes?.abort()
    limparRegistros()
    limparFiltros()

    const atual = new AbortController()
    consultaExecucoes = atual

    paginaExecucoes.value = pagina
    totalPaginasExecucoes.value = 0
    totalExecucoes.value = 0

    execucoes.value = []
    execucaoId.value = ''
    mensagem.value = ''

    carregandoExecucoes.value = true
    falhouExecucoes.value = false

    try {
      const resposta = await quarentenaService.listarExecucoes(
        {
          page: pagina,
          size: 20,
        },
        {
          signal: atual.signal,
        },
      )

      if (
        destruido ||
        atual.signal.aborted ||
        consultaExecucoes !== atual
      ) {
        return
      }

      totalPaginasExecucoes.value = resposta.totalPages
      totalExecucoes.value = resposta.totalElements
      execucoes.value = prepararExecucoes(extrairLista(resposta))
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
      if (!destruido && consultaExecucoes === atual) {
        carregandoExecucoes.value = false
        consultaExecucoes = null
      }
    }
  }

  async function selecionarExecucao(
    valor,
    { preservarFiltros = false, pagina = 0 } = {},
  ) {
    if (destruido) return

    limparRegistros()

    if (!preservarFiltros) {
      limparFiltros()
    }

    paginaRegistros.value = pagina
    execucaoId.value = String(valor ?? '')
    mensagem.value = ''

    if (!execucaoId.value) return

    const atual = new AbortController()
    consultaRegistros = atual
    carregandoRegistros.value = true

    try {
      const resposta = await quarentenaService.listarRegistros(
        execucaoId.value,
        {
          page: pagina,
          size: 20,
        },
        {
          signal: atual.signal,
        },
      )

      if (
        destruido ||
        atual.signal.aborted ||
        consultaRegistros !== atual
      ) {
        return
      }

      totalPaginasRegistros.value = resposta.totalPages
      totalRegistros.value = resposta.totalElements

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
      if (!destruido && consultaRegistros === atual) {
        carregandoRegistros.value = false
        consultaRegistros = null
      }
    }
  }

  function tentarRegistrosNovamente() {
    return selecionarExecucao(execucaoId.value, {
      preservarFiltros: true,
      pagina: paginaRegistros.value,
    })
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
    busca,
    tipoSelecionado,
    ordenacao,
    tiposDisponiveis,
    filtrosAtivos,
    registrosFiltrados,
    carregandoExecucoes,
    carregandoRegistros,
    falhouExecucoes,
    falhouRegistros,
    consultado,
    mensagem,
    listaParcial,
    paginaExecucoes,
    totalPaginasExecucoes,
    totalExecucoes,
    paginaRegistros,
    totalPaginasRegistros,
    totalRegistros,
    carregarExecucoes,
    selecionarExecucao,
    tentarRegistrosNovamente,
    limparFiltros,
    fecharMensagem,
    destruir,
  }
}
