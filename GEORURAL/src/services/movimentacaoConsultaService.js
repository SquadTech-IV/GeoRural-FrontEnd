import { ref } from 'vue'
import { rastreabilidadeService } from './rastreabilidadeService'

function texto(valor) {
  return valor == null ? '' : String(valor).trim()
}

function formatarData(valor) {
  const original = texto(valor)

  if (!original) return 'Não informado'

  if (!/^\d{4}-\d{2}-\d{2}T/.test(original)) {
    return original
  }

  const data = new Date(original)

  if (Number.isNaN(data.getTime())) {
    return original
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data)
}

function formatarQuantidade(valor) {
  if (valor == null || valor === '') {
    return 'Não informado'
  }

  const numero = Number(valor)

  if (!Number.isFinite(numero) || numero < 0) {
    return 'Não informado'
  }

  return new Intl.NumberFormat('pt-BR').format(numero)
}

function prepararDetalhe(dados) {
  return [
    {
      titulo: 'Zona de origem',
      valor: texto(dados.zonaOrigem) || 'Não informado',
    },
    {
      titulo: 'Zona de destino',
      valor: texto(dados.zonaDestino) || 'Não informado',
    },
    {
      titulo: 'Data da movimentação',
      valor: formatarData(dados.dataMovimentacao),
    },
    {
      titulo: 'Situação',
      valor: texto(dados.status) || 'Não informado',
    },
    {
      titulo: 'Responsável',
      valor: texto(dados.responsavel) || 'Não informado',
    },
    {
      titulo: 'Registros recebidos',
      valor: formatarQuantidade(dados.registrosRecebidos),
    },
    {
      titulo: 'Registros aprovados',
      valor: formatarQuantidade(dados.registrosAprovados),
    },
    {
      titulo: 'Registros rejeitados',
      valor: formatarQuantidade(dados.registrosRejeitados),
    },
    {
      titulo: 'Observação',
      valor: texto(dados.observacao) || 'Nenhuma observação.',
    },
  ]
}

export function criarConsultaMovimentacao(notificarErro) {
  const aberto = ref(false)
  const carregando = ref(false)
  const falhou = ref(false)
  const campos = ref([])
  const movimentacaoId = ref(null)

  let consultaAtual = null
  let destruido = false

  async function consultar(id) {
    if (destruido) return

    consultaAtual?.abort()

    const consulta = new AbortController()
    consultaAtual = consulta

    movimentacaoId.value = id
    aberto.value = true
    carregando.value = true
    falhou.value = false
    campos.value = []

    try {
      const resposta =
        await rastreabilidadeService.consultarMovimentacao(
          id,
          { signal: consulta.signal },
        )

      if (destruido || consulta.signal.aborted) return

      campos.value = prepararDetalhe(resposta)
    } catch (erro) {
      if (destruido || consulta.signal.aborted) return

      falhou.value = true

      notificarErro(
        erro?.message ||
        'Não foi possível consultar a movimentação.',
      )
    } finally {
      if (!destruido && consultaAtual === consulta) {
        carregando.value = false
      }
    }
  }

  function fechar() {
    consultaAtual?.abort()
    consultaAtual = null

    aberto.value = false
    carregando.value = false
    falhou.value = false
    campos.value = []
    movimentacaoId.value = null
  }

  function tentarNovamente() {
    if (movimentacaoId.value == null) return

    return consultar(movimentacaoId.value)
  }

  function destruir() {
    destruido = true
    consultaAtual?.abort()
  }

  return {
    aberto,
    carregando,
    falhou,
    campos,
    consultar,
    fechar,
    tentarNovamente,
    destruir,
  }
}
