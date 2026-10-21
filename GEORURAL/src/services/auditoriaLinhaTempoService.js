import { ref } from 'vue'

import {
  auditoriaService,
  requisicaoAuditoriaCancelada,
  validarIdAuditoria,
} from './auditoriaService'

function texto(valor) {
  return typeof valor === 'string'
    ? valor.trim()
    : ''
}

function objeto(valor) {
  return (
    valor !== null &&
    typeof valor === 'object' &&
    !Array.isArray(valor)
  )
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

function classeSituacao(valor) {
  const situacao = texto(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

  if (
    [
      'CONCLUIDO',
      'CONCLUIDA',
      'SUCESSO',
      'FINALIZADO',
      'FINALIZADA',
    ].includes(situacao)
  ) {
    return 'sucesso'
  }

  if (
    [
      'ERRO',
      'FALHA',
      'FALHOU',
      'REPROVADO',
      'REPROVADA',
    ].includes(situacao)
  ) {
    return 'erro'
  }

  if (
    [
      'EM_EXECUCAO',
      'PROCESSANDO',
      'EXECUTANDO',
      'EM_ANDAMENTO',
    ].includes(situacao)
  ) {
    return 'andamento'
  }

  return 'neutro'
}

export function obterExecucaoResultado(resultado) {
  const original = resultado?.original ?? resultado

  if (!objeto(original)) return null

  const id =
    original.execucaoId ??
    original.execucao?.id

  if (id == null) return null

  return validarIdAuditoria(id)
}

export function prepararLinhaTempoExecucao(dados) {
  if (!objeto(dados)) {
    throw new Error(
      'O backend retornou uma execução inválida.',
    )
  }

  const eventos =
    dados.eventos ??
    dados.etapas ??
    dados.movimentacoes

  if (eventos == null) {
    return []
  }

  if (!Array.isArray(eventos)) {
    throw new Error(
      'O backend retornou uma linha do tempo inválida.',
    )
  }

  return eventos.map((evento, indice) => {
    if (!objeto(evento)) {
      throw new Error(
        'A execução contém um evento inválido.',
      )
    }

    const situacao = texto(
      evento.status ?? evento.situacao,
    )

    const inicio =
      evento.inicio ??
      evento.dataInicio ??
      evento.dataHora ??
      evento.data

    const fim =
      evento.fim ??
      evento.dataFim

    return {
      chave: `${evento.id ?? 'evento'}-${indice}`,
      titulo:
        texto(
          evento.titulo ??
          evento.etapa ??
          evento.nome,
        ) || `Evento ${indice + 1}`,
      descricao: texto(
        evento.descricao ?? evento.mensagem,
      ),
      situacao: situacao || 'Não informada',
      classe: classeSituacao(situacao),
      inicio: formatarData(inicio),
      fim: fim ? formatarData(fim) : '',
    }
  })
}

export function criarConsultaLinhaTempo() {
  const eventos = ref([])
  const carregando = ref(false)
  const consultado = ref(false)
  const falhou = ref(false)

  let consulta = null
  let destruido = false

  function limpar() {
    consulta?.abort()
    consulta = null

    eventos.value = []
    carregando.value = false
    consultado.value = false
    falhou.value = false
  }

  async function consultar(execucaoId) {
    if (destruido) return

    limpar()

    const atual = new AbortController()
    consulta = atual
    carregando.value = true

    try {
      const dados =
        await auditoriaService.consultarExecucao(
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

      eventos.value = prepararLinhaTempoExecucao(
        dados,
      )

      consultado.value = true
    } catch (erro) {
      if (
        destruido ||
        atual.signal.aborted ||
        consulta !== atual ||
        requisicaoAuditoriaCancelada(erro)
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
    eventos,
    carregando,
    consultado,
    falhou,
    consultar,
    limpar,
    destruir,
  }
}
