import { computed, ref } from 'vue'

import { zonaTratadaService, requisicaoZonaTratadaCancelada } from './zonaTratadaService'

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

function prepararConjuntos(lista) {
  return lista.map((item, indice) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('A listagem contém um conjunto tratado inválido.')
    }

    const id = item.conjuntoId ?? item.conjunto?.id ?? item.id ?? null

    return {
      chave: `${id ?? 'conjunto'}-${item.execucaoId ?? 'execucao'}-${item.versaoId ?? indice}`,
      id,
      execucaoId: item.execucaoId ?? item.execucao?.id ?? null,
      nome: texto(item.conjuntoNome ?? item.conjunto?.nome ?? item.nome) || 'Não informado',
      fonte:
        texto(
          item.fonteNome ??
            item.fonte?.nome ??
            (typeof item.fonte === 'string' ? item.fonte : null),
        ) || 'Não informada',
      tipo:
        texto(
          item.tipoNome ?? item.tipo?.nome ?? (typeof item.tipo === 'string' ? item.tipo : null),
        ) || 'Não informado',
      situacao: texto(item.situacao ?? item.status) || 'Não informada',
      competencia: texto(item.competencia) || 'Não informada',
      original: item,
    }
  })
}

export function criarConsultaZonaTratada() {
  const conjuntos = ref([])
  const busca = ref('')
  const selecionado = ref(null)

  const carregando = ref(false)
  const consultado = ref(false)
  const falhou = ref(false)

  const mensagem = ref('')
  const listaParcial = ref(false)

  let consulta = null
  let destruido = false

  const conjuntosFiltrados = computed(() => {
    const termo = normalizar(busca.value)

    if (!termo) {
      return conjuntos.value
    }

    return conjuntos.value.filter((conjunto) => {
      const conteudo = [
        conjunto.nome,
        conjunto.fonte,
        conjunto.tipo,
        conjunto.situacao,
        conjunto.competencia,
      ]
        .map(normalizar)
        .join(' ')

      return conteudo.includes(termo)
    })
  })

  async function consultar() {
    if (destruido) return

    consulta?.abort()

    const atual = new AbortController()
    consulta = atual

    carregando.value = true
    consultado.value = false
    falhou.value = false
    mensagem.value = ''
    listaParcial.value = false

    conjuntos.value = []
    selecionado.value = null

    try {
      const resposta = await zonaTratadaService.listarConjuntos({}, { signal: atual.signal })

      if (destruido || atual.signal.aborted || consulta !== atual) {
        return
      }

      const lista = Array.isArray(resposta) ? resposta : resposta.content

      conjuntos.value = prepararConjuntos(lista)

      listaParcial.value =
        !Array.isArray(resposta) &&
        Number.isSafeInteger(resposta.totalElements) &&
        resposta.totalElements > lista.length

      consultado.value = true
    } catch (erro) {
      if (
        destruido ||
        atual.signal.aborted ||
        consulta !== atual ||
        requisicaoZonaTratadaCancelada(erro)
      ) {
        return
      }

      falhou.value = true
      mensagem.value = erro.message
    } finally {
      if (!destruido && consulta === atual) {
        carregando.value = false
        consulta = null
      }
    }
  }

  function selecionar(conjunto) {
    selecionado.value = conjunto
  }

  function limparBusca() {
    busca.value = ''
  }

  function fecharMensagem() {
    mensagem.value = ''
  }

  function destruir() {
    destruido = true
    consulta?.abort()
  }

  return {
    conjuntos,
    busca,
    selecionado,
    conjuntosFiltrados,
    carregando,
    consultado,
    falhou,
    mensagem,
    listaParcial,
    consultar,
    selecionar,
    limparBusca,
    fecharMensagem,
    destruir,
  }
}
