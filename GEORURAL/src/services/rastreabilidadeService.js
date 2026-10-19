import api from './api'

import {
  prepararErroConsulta,
} from './rastreabilidadeErroService'

const ZONAS = [
  'BRUTA',
  'QUARENTENA',
  'TRATADA',
  'PUBLICADA',
]

const CONCLUIDOS = new Set([
  'CONCLUIDO',
  'CONCLUIDA',
  'SUCESSO',
  'APROVADO',
  'PROCESSADO',
  'PUBLICADO',
  'RECEBIDO',
  'FINALIZADO',
  'OK',
])

const EM_ANDAMENTO = new Set([
  'PENDENTE',
  'EM_ANDAMENTO',
  'PROCESSANDO',
  'VALIDANDO',
  'EM_EXECUCAO',
  'EM_TRATAMENTO',
  'INICIADO',
])

function validarId(valor) {
  const id = String(valor ?? '').trim()

  if (!/^[1-9]\d*$/.test(id)) {
    throw new Error(
      'Informe um ID de conjunto positivo válido.',
    )
  }

  return id
}

function texto(valor) {
  return valor == null ? '' : String(valor).trim()
}

function dataFormatada(valor) {
  const original = texto(valor)

  if (!original) return 'Não informada'

  const data = new Date(original)

  if (Number.isNaN(data.getTime())) {
    return original
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data)
}

function normalizarStatus(valor) {
  return texto(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[ -]+/g, '_')
}

function objeto(dados) {
  if (
    !dados ||
    typeof dados !== 'object' ||
    Array.isArray(dados)
  ) {
    throw new Error(
      'O servidor retornou uma resposta inválida.',
    )
  }

  return dados
}

export function normalizarTrajetoria(dados) {
  objeto(dados)

  if (!Array.isArray(dados.eventos)) {
    throw new Error(
      'A trajetória não possui uma lista válida de eventos.',
    )
  }

  const eventos = dados.eventos.map((item, indice) => {
    objeto(item)

    const zona = texto(item.zona).toUpperCase()

    if (!ZONAS.includes(zona)) {
      throw new Error(
        'A trajetória contém uma zona desconhecida.',
      )
    }

    return {
      ...item,
      zona,
      chave: String(indice),
      titulo: `${zona} · ${texto(item.status) || 'Sem situação'}`,
      dataFormatada: dataFormatada(item.dataHora),
    }
  })

  const ultimas = new Map()

  for (const evento of eventos) {
    ultimas.set(evento.zona, evento)
  }

  const ultimo = eventos.at(-1)

  const zonaAtual = eventos.length
    ? texto(dados.zonaAtual || ultimo.zona).toUpperCase()
    : null

  if (zonaAtual && !ZONAS.includes(zonaAtual)) {
    throw new Error(
      'A zona atual informada é inválida.',
    )
  }

  const passagens = [...ultimas.values()].map((evento) => {
    const original = normalizarStatus(evento.status)

    const status = CONCLUIDOS.has(original)
      ? 'done'
      : (
          EM_ANDAMENTO.has(original) &&
          evento.chave === ultimo.chave
        )
        ? 'atual'
        : 'ressalva'

    return {
      zona: evento.zona,
      status,
      statusOriginal: texto(evento.status),
      quando: evento.dataHora,
      count: '',
      obs: texto(evento.descricao),
    }
  })

  return {
    ...dados,
    eventos,
    passagens,
    zonaAtual,
  }
}

export function prepararDetalheEvento(evento) {
  return [
    {
      titulo: 'Zona',
      valor: texto(evento.zona) || 'Não informada',
    },
    {
      titulo: 'Tipo',
      valor: texto(evento.tipo) || 'Não informado',
    },
    {
      titulo: 'Data',
      valor: dataFormatada(evento.dataHora),
    },
    {
      titulo: 'Situação',
      valor: texto(evento.status) || 'Não informada',
    },
    {
      titulo: 'Descrição',
      valor: texto(evento.descricao) || 'Sem descrição.',
    },
  ]
}

async function consultar(caminho, signal) {
  try {
    const { data } = await api.get(caminho, {
      signal,
    })

    return data
  } catch (erro) {
    throw prepararErroConsulta(
      erro,
      'Não foi possível consultar o conjunto.',
    )
  }
}

export const rastreabilidadeService = {
  async consultarTrajetoria(
    conjuntoId,
    { signal } = {},
  ) {
    const id = validarId(conjuntoId)

    const dados = await consultar(
      `/api/conjuntos/${id}/trajetoria`,
      signal,
    )

    return normalizarTrajetoria(dados)
  },

  async consultarStatusAtual(
    conjuntoId,
    { signal } = {},
  ) {
    const id = validarId(conjuntoId)

    const dados = await consultar(
      `/api/conjuntos/${id}/status-atual`,
      signal,
    )

    return objeto(dados)
  },
}
