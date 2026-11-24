import api from './api'

function validarId(valor) {
  const id = String(valor ?? '').trim()

  if (
    !/^[1-9]\d*$/.test(id) ||
    (
      typeof valor === 'number' &&
      !Number.isSafeInteger(valor)
    )
  ) {
    throw new Error('Informe um identificador válido.')
  }

  return id
}

export const arquivoService = {
  async listar(nome, situacao, { signal } = {}) {
    const params = {}

    if (nome) params.nome = nome
    if (situacao) params.situacao = situacao

    const { data } = await api.get('/api/arquivos', {
      params,
      signal,
    })

    return data
  },

  async detalhe(id, { signal } = {}) {
    const { data } = await api.get(
      `/api/arquivos/${validarId(id)}`,
      { signal },
    )

    return data
  },

  async baixarOriginal(id, { signal } = {}) {
    const { data } = await api.get(
      `/api/arquivos/${validarId(id)}/download`,
      {
        signal,
        responseType: 'blob',
        timeout: 60000,
      },
    )

    return data
  },
}