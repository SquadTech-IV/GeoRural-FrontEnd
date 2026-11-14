import api from './api'

function mensagemErro(erro) {
  const dados = erro?.response?.data

  const mensagem =
    typeof dados?.mensagem === 'string' ? dados.mensagem.trim()
      : typeof dados?.message === 'string' ? dados.message.trim()
        : ''

  if (mensagem) return mensagem

  if (erro?.isAxiosError && !erro.response) {
    return 'Não foi possível acessar o backend. Verifique se ele está em execução.'
  }

  if (erro?.response?.status >= 500) {
    return 'O servidor não conseguiu concluir a operação.'
  }

  return erro?.message || 'Não foi possível concluir a operação.'
}

async function requisitar(operacao) {
  try {
    return await operacao()
  } catch (erro) {
    throw new Error(mensagemErro(erro), { cause: erro })
  }
}

export const operacaoService = {
  conjuntos() {
    return requisitar(async () => (await api.get('/api/conjuntos')).data)
  },

  resumo({ conjuntoId, dias }) {
    return requisitar(async () => {
      const { data } = await api.get('/api/pipeline/resumo', {
        params: { conjuntoId, dias },
      })
      return data
    })
  },

  execucoes({ conjuntoId, filtro, limite, dias }) {
    return requisitar(async () => {
      const { data } = await api.get('/api/pipeline/execucoes', {
        params: { conjuntoId, filtro, limite, dias },
      })
      return data
    })
  },

  etapas(dagRunId) {
    return requisitar(async () => {
      const { data } = await api.get(
        `/api/pipeline/execucoes/${encodeURIComponent(dagRunId)}/etapas`,
      )
      return data
    })
  },

  reprocessarEtapa({ etapa, conjuntoId, arquivoBrutoId, dagRunId }) {
    return requisitar(async () => {
      const { data } = await api.post(
        `/api/pipeline/etapas/${encodeURIComponent(etapa)}`,
        { conjuntoId, arquivoBrutoId, dagRunId },
        { timeout: 600000 },
      )
      return data
    })
  },
}
