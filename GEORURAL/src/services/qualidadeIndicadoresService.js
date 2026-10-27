import api from './api'

// Endpoints da US15 (indicadores publicados / zona publicada).
const ROTAS = {
  lista: '/api/qualidade/indicadores',
  resultados: (versaoId) => `/api/qualidade/indicadores/versoes/${versaoId}`,
}

export function requisicaoIndicadoresCancelada(erro) {
  return (
    erro?.code === 'ERR_CANCELED' || erro?.name === 'CanceledError' || erro?.name === 'AbortError'
  )
}

function validarLista(dados) {
  if (!Array.isArray(dados)) {
    throw new Error('O backend retornou uma lista de indicadores inválida.')
  }
  return dados
}

export function mensagemErroIndicadores(erro) {
  if (requisicaoIndicadoresCancelada(erro)) {
    return ''
  }

  const status = erro?.response?.status

  if (status === 404) {
    return 'O serviço de indicadores publicados não foi encontrado.'
  }
  if (status === 401 || status === 403) {
    return 'Você não tem permissão para consultar os indicadores publicados.'
  }
  if (erro?.isAxiosError && !erro.response) {
    return 'Não foi possível acessar o backend. Verifique a conexão e tente novamente.'
  }
  if (typeof status === 'number' && status >= 500) {
    return 'O servidor não conseguiu consultar os indicadores. Tente novamente mais tarde.'
  }

  const mensagemServidor =
    typeof erro?.response?.data?.mensagem === 'string'
      ? erro.response.data.mensagem.trim()
      : typeof erro?.response?.data?.message === 'string'
        ? erro.response.data.message.trim()
        : ''

  if (mensagemServidor) {
    return mensagemServidor
  }
  if (typeof erro?.message === 'string' && erro.message.trim()) {
    return erro.message.trim()
  }
  return 'Não foi possível consultar os indicadores publicados.'
}

async function obter(rota, params, signal) {
  const { data } = await api.get(rota, { params, signal, timeout: 30000 })
  return data
}

async function executar(operacao) {
  try {
    return await operacao()
  } catch (erro) {
    if (requisicaoIndicadoresCancelada(erro)) throw erro
    throw new Error(mensagemErroIndicadores(erro), { cause: erro })
  }
}

export const qualidadeIndicadoresService = {
  // Versões publicadas de cada indicador (uma por indicador + versão do dataset), com a regra usada.
  listar(indicador, { signal } = {}) {
    return executar(async () =>
      validarLista(await obter(ROTAS.lista, { indicador: indicador || 'TODOS' }, signal)),
    )
  },

  // Resultados (um por imóvel) de uma versão publicada.
  resultados(versaoId, indicador, { signal } = {}) {
    return executar(async () =>
      validarLista(
        await obter(ROTAS.resultados(versaoId), { indicador: indicador || 'TODOS' }, signal),
      ),
    )
  },
}
