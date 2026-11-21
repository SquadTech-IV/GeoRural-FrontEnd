import { ref, shallowRef, watch } from 'vue'
import { mensagemErroApi } from '../utils/mensagemErroApi'
import { autenticacaoService } from './autenticacaoService'
import { nomePrevisto, receberExportacao } from './exportacaoVersaoService'

export const exportacao = shallowRef(null)
export const modalExportacaoAberto = ref(false)
let transferencia = null

export async function iniciarExportacao(versao, formato) {
  modalExportacaoAberto.value = true
  if (transferencia) return

  const operacao = new AbortController()
  transferencia = operacao
  const dados = {
    versao,
    formato,
    nome: nomePrevisto(versao, formato),
  }
  exportacao.value = { ...dados, estado: 'preparando' }

  try {
    const resultado = await receberExportacao(versao, formato, {
      signal: operacao.signal,
      aoReceber(nome) {
        if (transferencia === operacao) {
          exportacao.value = { ...dados, nome, estado: 'recebendo' }
        }
      },
    })
    if (transferencia === operacao) {
      exportacao.value = { ...dados, ...resultado, estado: 'pronto' }
    }
  } catch (erro) {
    if (transferencia === operacao) {
      const mensagem =
        erro.response?.status === 409
          ? 'Esta versão não está disponível para exportação. Confira se ela está publicada.'
          : mensagemErroApi(erro, 'Não foi possível receber o arquivo. Tente novamente.')
      exportacao.value = { ...exportacao.value, estado: 'erro', mensagem }
    }
  } finally {
    if (transferencia === operacao) transferencia = null
  }
}

export function cancelarTransferencia() {
  if (!transferencia) return
  transferencia.abort()
  transferencia = null
  exportacao.value = { ...exportacao.value, estado: 'cancelado' }
}

export function baixarExportacao() {
  if (exportacao.value?.estado !== 'pronto') return
  const { arquivo, ...dados } = exportacao.value
  const url = URL.createObjectURL(arquivo)
  try {
    const link = document.createElement('a')
    link.href = url
    link.download = dados.nome
    link.click()
    exportacao.value = { ...dados, estado: 'download-iniciado' }
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

watch(
  () => autenticacaoService.estado.versao,
  () => {
    cancelarTransferencia()
    modalExportacaoAberto.value = false
    exportacao.value = null
  },
  { flush: 'sync' },
)
