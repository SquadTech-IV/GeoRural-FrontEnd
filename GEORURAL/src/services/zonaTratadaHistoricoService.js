import { ref } from 'vue'

import {
  zonaTratadaService,
  requisicaoZonaTratadaCancelada,
} from './zonaTratadaService'

function texto(valor) {
  return typeof valor === 'string'
    ? valor.trim()
    : ''
}

function formatarData(valor) {
  if (!valor) return 'Não informado'

  const data = new Date(valor)

  if (Number.isNaN(data.getTime())) {
    return String(valor)
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data)
}

export function prepararHistoricoTransformacoes(
  resposta,
) {
  const lista = Array.isArray(resposta)
    ? resposta
    : resposta?.content

  if (!Array.isArray(lista)) {
    throw new Error(
      'O backend retornou um histórico de transformações inválido.',
    )
  }

  return lista.map((item, indice) => {
    if (
      !item ||
      typeof item !== 'object' ||
      Array.isArray(item)
    ) {
      throw new Error(
        'O histórico contém uma transformação inválida.',
      )
    }

    return {
      chave: `${item.id ?? 'transformacao'}-${indice}`,
      titulo: texto(
        item.nome ??
        item.titulo ??
        item.etapa,
      ) || `Transformação ${indice + 1}`,
      descricao: texto(
        item.descricao ?? item.mensagem,
      ),
      situacao: texto(
        item.situacao ?? item.status,
      ) || 'Não informada',
      data: formatarData(
        item.dataExecucao ??
        item.dataHora ??
        item.inicio ??
        item.data,
      ),
    }
  })
}

export function criarConsultaHistoricoTratada() {
  const transformacoes = ref([])
  const carregando = ref(false)
  const consultado = ref(false)
  const falhou = ref(false)
  const listaParcial = ref(false)

  let consulta = null
  let destruido = false

  function limpar() {
    consulta?.abort()
    consulta = null

    transformacoes.value = []
    carregando.value = false
    consultado.value = false
    falhou.value = false
    listaParcial.value = false
  }

  async function consultar(execucaoId) {
    if (destruido) return

    limpar()

    const atual = new AbortController()
    consulta = atual
    carregando.value = true

    try {
      const resposta =
        await zonaTratadaService.consultarTransformacoes(
          execucaoId,
          { signal: atual.signal },
        )

      if (
        destruido ||
        atual.signal.aborted ||
        consulta !== atual
      ) {
        return
      }

      transformacoes.value =
        prepararHistoricoTransformacoes(resposta)

      listaParcial.value =
        !Array.isArray(resposta) &&
        Number.isSafeInteger(resposta.totalElements) &&
        resposta.totalElements >
          transformacoes.value.length

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
      throw erro
    } finally {
      if (!destruido && consulta === atual) {
        carregando.value = false
        consulta = null
      }
    }
  }

  function destruir() {
    destruido = true
    limpar()
  }

  return {
    transformacoes,
    carregando,
    consultado,
    falhou,
    listaParcial,
    consultar,
    limpar,
    destruir,
  }
}
