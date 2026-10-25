import { ref } from 'vue'

import {
  zonaTratadaService,
  requisicaoZonaTratadaCancelada,
  validarIdZonaTratada,
} from './zonaTratadaService'

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

function duracaoFormatada(valor) {
  if (
    typeof valor !== 'number' ||
    !Number.isFinite(valor) ||
    valor < 0
  ) {
    return 'Não informado'
  }

  return `${new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 2,
  }).format(valor)} s`
}

export function prepararInformacoesProcessamento(
  dados,
  execucaoId,
) {
  if (
    !dados ||
    typeof dados !== 'object' ||
    Array.isArray(dados)
  ) {
    throw new Error(
      'O backend retornou informações de processamento inválidas.',
    )
  }

  const id = validarIdZonaTratada(execucaoId)

  const idRetornado =
    dados.execucaoId ?? dados.id

  if (
    idRetornado != null &&
    validarIdZonaTratada(idRetornado) !== id
  ) {
    throw new Error(
      'As informações recebidas pertencem a outra execução.',
    )
  }

  return {
    id,
    campos: [
      {
        chave: 'situacao',
        titulo: 'Situação',
        valor: texto(
          dados.situacao ?? dados.status,
        ),
      },
      {
        chave: 'etapa',
        titulo: 'Etapa',
        valor: texto(dados.etapa),
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
        valor: duracaoFormatada(
          dados.duracaoSegundos ??
          dados.duracaoSeg,
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
    ],
    observacao:
      typeof dados.mensagem === 'string'
        ? dados.mensagem.trim()
        : typeof dados.descricao === 'string'
          ? dados.descricao.trim()
          : '',
  }
}

export function criarConsultaProcessamentoTratada() {
  const processamento = ref(null)
  const carregando = ref(false)
  const falhou = ref(false)

  let consulta = null
  let destruido = false

  function limpar() {
    consulta?.abort()
    consulta = null

    processamento.value = null
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
      const id = validarIdZonaTratada(execucaoId)

      const dados =
        await zonaTratadaService.consultarProcessamento(
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

      processamento.value =
        prepararInformacoesProcessamento(
          dados,
          id,
        )
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
    processamento,
    carregando,
    falhou,
    consultar,
    limpar,
    destruir,
  }
}
