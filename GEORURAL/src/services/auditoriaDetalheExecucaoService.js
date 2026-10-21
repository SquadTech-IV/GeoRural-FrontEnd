import { ref } from 'vue'

import {
  auditoriaService,
  requisicaoAuditoriaCancelada,
  validarIdAuditoria,
} from './auditoriaService'

function texto(valor) {
  if (
    typeof valor === 'string' ||
    typeof valor === 'number'
  ) {
    return String(valor).trim() || 'Não informado'
  }

  return 'Não informado'
}

function quantidade(valor) {
  if (
    typeof valor !== 'number' ||
    !Number.isSafeInteger(valor) ||
    valor < 0
  ) {
    return 'Não informado'
  }

  return new Intl.NumberFormat('pt-BR').format(valor)
}

function dataFormatada(valor) {
  if (!valor) return 'Não informado'

  const data = new Date(valor)

  if (Number.isNaN(data.getTime())) {
    return texto(valor)
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(data)
}

export function prepararDetalheExecucao(dados, id) {
  if (
    !dados ||
    typeof dados !== 'object' ||
    Array.isArray(dados)
  ) {
    throw new Error(
      'O backend retornou um detalhe de execução inválido.',
    )
  }

  const identificador = validarIdAuditoria(id)

  const idRetornado =
    dados.id ??
    dados.execucaoId

  if (
    idRetornado != null &&
    validarIdAuditoria(idRetornado) !== identificador
  ) {
    throw new Error(
      'O detalhe recebido pertence a outra execução.',
    )
  }

  const duracao =
    dados.duracaoSegundos ??
    dados.duracaoSeg

  const duracaoFormatada =
    typeof duracao === 'number' &&
    Number.isFinite(duracao) &&
    duracao >= 0
      ? `${new Intl.NumberFormat('pt-BR', {
          maximumFractionDigits: 2,
        }).format(duracao)} s`
      : 'Não informado'

  return {
    id: identificador,
    campos: [
      {
        chave: 'situacao',
        titulo: 'Situação',
        valor: texto(
          dados.status ?? dados.situacao,
        ),
      },
      {
        chave: 'etapa',
        titulo: 'Etapa',
        valor: texto(dados.etapa),
      },
      {
        chave: 'conjunto',
        titulo: 'Conjunto',
        valor: texto(
          dados.conjuntoNome ??
          dados.conjunto?.nome ??
          (
            typeof dados.conjunto === 'string'
              ? dados.conjunto
              : null
          ),
        ),
      },
      {
        chave: 'responsavel',
        titulo: 'Responsável',
        valor: texto(
          dados.usuarioNome ??
          dados.usuario?.nome ??
          dados.responsavel,
        ),
      },
      {
        chave: 'inicio',
        titulo: 'Início',
        valor: dataFormatada(
          dados.inicio ?? dados.dataInicio,
        ),
      },
      {
        chave: 'fim',
        titulo: 'Fim',
        valor: dataFormatada(
          dados.fim ?? dados.dataFim,
        ),
      },
      {
        chave: 'duracao',
        titulo: 'Duração',
        valor: duracaoFormatada,
      },
      {
        chave: 'versao',
        titulo: 'Versão gerada',
        valor: texto(
          dados.versaoGerada?.numero ??
          dados.versaoNumero ??
          (
            typeof dados.versaoGerada !== 'object'
              ? dados.versaoGerada
              : null
          ),
        ),
      },
      {
        chave: 'processados',
        titulo: 'Registros processados',
        valor: quantidade(
          dados.registrosProcessados,
        ),
      },
      {
        chave: 'rejeitados',
        titulo: 'Registros rejeitados',
        valor: quantidade(
          dados.registrosRejeitados,
        ),
      },
    ],
    observacao:
      typeof dados.mensagem === 'string'
        ? dados.mensagem.trim()
        : typeof dados.descricao === 'string'
          ? dados.descricao.trim()
          : '',
  }
}

export function criarConsultaDetalheExecucao() {
  const detalhe = ref(null)
  const carregando = ref(false)
  const falhou = ref(false)

  let consulta = null
  let destruido = false

  function limpar() {
    consulta?.abort()
    consulta = null

    detalhe.value = null
    carregando.value = false
    falhou.value = false
  }

  async function consultar(execucaoId) {
    if (destruido) return

    limpar()

    const atual = new AbortController()
    consulta = atual
    carregando.value = true

    try {
      const id = validarIdAuditoria(execucaoId)

      const dados =
        await auditoriaService.consultarExecucao(
          id,
          { signal: atual.signal },
        )

      if (
        destruido ||
        atual.signal.aborted ||
        consulta !== atual
      ) {
        return
      }

      detalhe.value = prepararDetalheExecucao(
        dados,
        id,
      )
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
    detalhe,
    carregando,
    falhou,
    consultar,
    limpar,
    destruir,
  }
}
