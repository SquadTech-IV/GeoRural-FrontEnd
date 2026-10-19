import api from './api'

import {
  prepararErroConsulta,
} from './rastreabilidadeErroService'

const ROTAS = {
  conjuntos: '/api/rastreabilidade/conjuntos',

  arquivos: (conjuntoId) =>
    `/api/rastreabilidade/conjuntos/${conjuntoId}/arquivos`,

  trajetoria: (arquivoId) =>
    `/api/rastreabilidade/arquivos/${arquivoId}/trajetoria`,

  movimentacao: (movimentacaoId) =>
    `/api/rastreabilidade/movimentacoes/${movimentacaoId}`,
}

function validarId(valor, nome) {
  const id = String(valor ?? '').trim()

  if (!/^[1-9]\d*$/.test(id)) {
    throw new Error(
      `Informe um identificador válido para ${nome}.`,
    )
  }

  return id
}

async function consultar(caminho, signal, mensagemErro) {
  try {
    const resposta = await api.get(caminho, {
      signal,
    })

    return resposta.data
  } catch (erro) {
    throw prepararErroConsulta(erro, mensagemErro)
  }
}

function normalizarLista(dados, nome) {
  const lista = Array.isArray(dados)
    ? dados
    : dados?.content

  if (!Array.isArray(lista)) {
    throw new Error(
      `O servidor retornou uma lista de ${nome} inválida.`,
    )
  }

  if (
    lista.some(
      (item) =>
        !item ||
        typeof item !== 'object' ||
        Array.isArray(item),
    )
  ) {
    throw new Error(
      `O servidor retornou registros de ${nome} inválidos.`,
    )
  }

  return lista
}

function normalizarObjeto(dados, nome) {
  if (
    !dados ||
    typeof dados !== 'object' ||
    Array.isArray(dados)
  ) {
    throw new Error(
      `O servidor retornou ${nome} inválido.`,
    )
  }

  return dados
}

async function listarConjuntos({ signal } = {}) {
  const dados = await consultar(
    ROTAS.conjuntos,
    signal,
    'Não foi possível consultar os conjuntos.',
  )

  return normalizarLista(dados, 'conjuntos')
}

async function listarArquivos(
  conjuntoId,
  { signal } = {},
) {
  const id = validarId(conjuntoId, 'o conjunto')

  const dados = await consultar(
    ROTAS.arquivos(id),
    signal,
    'Não foi possível consultar os arquivos do conjunto.',
  )

  return normalizarLista(dados, 'arquivos')
}

async function consultarTrajetoria(
  arquivoId,
  { signal } = {},
) {
  const id = validarId(arquivoId, 'o arquivo')

  const dados = await consultar(
    ROTAS.trajetoria(id),
    signal,
    'Não foi possível consultar a trajetória do arquivo.',
  )

  const trajetoria = normalizarObjeto(
    dados,
    'uma trajetória',
  )

  if (!Array.isArray(trajetoria.passagens)) {
    throw new Error(
      'O servidor retornou uma trajetória sem uma lista válida de passagens.',
    )
  }

  return {
    ...trajetoria,
    passagens: normalizarLista(
      trajetoria.passagens,
      'passagens',
    ),
  }
}

async function consultarMovimentacao(
  movimentacaoId,
  { signal } = {},
) {
  const id = validarId(
    movimentacaoId,
    'a movimentação',
  )

  const dados = await consultar(
    ROTAS.movimentacao(id),
    signal,
    'Não foi possível consultar a movimentação.',
  )

  return normalizarObjeto(
    dados,
    'um detalhamento de movimentação',
  )
}

export const rastreabilidadeService = {
  listarConjuntos,
  listarArquivos,
  consultarTrajetoria,
  consultarMovimentacao,
}
