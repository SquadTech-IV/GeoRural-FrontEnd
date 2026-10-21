import api from './api'

import {
  mensagemErroPublicacao,
  requisicaoPublicacaoCancelada,
} from './publicacaoErroService'

export {
  requisicaoPublicacaoCancelada,
} from './publicacaoErroService'

const alteracoes = new Set()

export function validarIdPublicacao(valor) {
  if (
    typeof valor === 'number' &&
    !Number.isSafeInteger(valor)
  ) {
    throw new Error('O identificador informado é inválido.')
  }

  const id = String(valor ?? '').trim()

  if (!/^[1-9]\d*$/.test(id)) {
    throw new Error('Informe um identificador válido.')
  }

  return id
}

function objeto(valor) {
  return (
    valor &&
    typeof valor === 'object' &&
    !Array.isArray(valor)
  )
}

async function executar(operacao, contexto) {
  try {
    return await operacao()
  } catch (erro) {
    if (requisicaoPublicacaoCancelada(erro)) {
      throw erro
    }

    throw new Error(
      mensagemErroPublicacao(erro, contexto),
      { cause: erro },
    )
  }
}

function adaptarQualidade(dados, id) {
  const quantidades = [
    'totalRegistros',
    'registrosValidos',
    'registrosInvalidos',
    'registrosEmQuarentena',
  ]

  if (
    !objeto(dados) ||
    validarIdPublicacao(dados.execucaoId) !== id ||
    typeof dados.aprovado !== 'boolean' ||
    typeof dados.statusValidacao !== 'string' ||
    !quantidades.every(
      campo =>
        Number.isSafeInteger(dados[campo]) &&
        dados[campo] >= 0,
    ) ||
    !Number.isFinite(dados.percentualAprovacao) ||
    dados.percentualAprovacao < 0 ||
    dados.percentualAprovacao > 100 ||
    !Array.isArray(dados.regrasVioladas) ||
    !Array.isArray(dados.motivosReprovacao) ||
    dados.motivosReprovacao.some(
      motivo => typeof motivo !== 'string',
    ) ||
    dados.regrasVioladas.some(
      regra =>
        !objeto(regra) ||
        typeof regra.nomeRegra !== 'string' ||
        typeof regra.tipo !== 'string' ||
        typeof regra.severidade !== 'string' ||
        !Number.isSafeInteger(regra.quantidade) ||
        regra.quantidade < 0,
    )
  ) {
    throw new Error(
      'O backend retornou um relatório de qualidade inválido.',
    )
  }

  return {
    ...dados,
    execucaoId: id,
  }
}

function adaptarVersao(dados, id, acao) {
  if (
    !objeto(dados) ||
    String(dados.id) !== id ||
    typeof dados.situacao !== 'string' ||
    (
      acao === 'publicar' &&
      (
        dados.situacao !== 'VIGENTE' ||
        !dados.dataPublicacao
      )
    ) ||
    (
      dados.conjuntoId != null &&
      !/^[1-9]\d*$/.test(String(dados.conjuntoId))
    ) ||
    (
      dados.execucaoId != null &&
      !/^[1-9]\d*$/.test(String(dados.execucaoId))
    ) ||
    (
      acao === 'publicar' &&
      dados.execucaoId == null
    )
  ) {
    throw new Error(
      'O servidor respondeu sem uma confirmação válida. Confira a situação da versão antes de reenviar.',
    )
  }

  return {
    ...dados,
    id,
    conjuntoId: dados.conjuntoId == null
      ? null
      : String(dados.conjuntoId),
    execucaoId: dados.execucaoId == null
      ? null
      : String(dados.execucaoId),
  }
}

function alterar(versaoId, acao, motivo) {
  return executar(async () => {
    const id = validarIdPublicacao(versaoId)

    if (alteracoes.has(id)) {
      throw new Error(
        'Já existe uma solicitação em andamento para esta versão.',
      )
    }

    if (
      acao === 'reprovar' &&
      (
        typeof motivo !== 'string' ||
        !motivo.trim()
      )
    ) {
      throw new Error(
        'Informe o motivo da reprovação.',
      )
    }

    alteracoes.add(id)

    try {
      const corpo = acao === 'reprovar'
        ? { motivo: motivo.trim() }
        : null

      const { data } = await api.post(
        `/api/versoes/${id}/${acao}`,
        corpo,
        { timeout: 60000 },
      )

      return adaptarVersao(data, id, acao)
    } finally {
      alteracoes.delete(id)
    }
  }, 'publicacao')
}

export const publicacaoService = {
  consultarQualidade(execucaoId, { signal } = {}) {
    return executar(async () => {
      const id = validarIdPublicacao(execucaoId)

      const { data } = await api.get(
        `/api/execucoes/${id}/qualidade`,
        {
          signal,
          timeout: 30000,
        },
      )

      return adaptarQualidade(data, id)
    }, 'conferencia')
  },

  publicar(versaoId) {
    return alterar(versaoId, 'publicar')
  },

  reprovar(versaoId, motivo) {
    return alterar(versaoId, 'reprovar', motivo)
  },
}
