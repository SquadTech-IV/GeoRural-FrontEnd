import api from './api'
import { executarConsultaQuarentena } from './quarentenaErroService'

export {
  mensagemErroQuarentena,
  requisicaoQuarentenaCancelada,
} from './quarentenaErroService'

const BASE = '/api/v1/qualidade'

export function validarIdQuarentena(valor) {
  const id = String(valor ?? '').trim()

  if (
    !/^[1-9]\d*$/.test(id) ||
    (typeof valor === 'number' && !Number.isSafeInteger(valor))
  ) {
    throw new Error('Informe um identificador válido.')
  }

  return id
}

function inteiro(valor, padrao, minimo, maximo) {
  const numero = valor ?? padrao

  if (
    !Number.isSafeInteger(numero) ||
    numero < minimo ||
    numero > maximo
  ) {
    throw new Error('Informe uma página e um tamanho de consulta válidos.')
  }

  return numero
}

export function validarPaginaQuarentena(dados, pagina) {
  if (
    !dados ||
    !Array.isArray(dados.content) ||
    !Number.isSafeInteger(dados.number) ||
    dados.number !== pagina ||
    !Number.isSafeInteger(dados.totalElements) ||
    dados.totalElements < 0 ||
    !Number.isSafeInteger(dados.totalPages) ||
    dados.totalPages < 0 ||
    !Number.isSafeInteger(dados.size) ||
    dados.size < 1 ||
    dados.content.length > dados.size ||
    dados.content.length > dados.totalElements ||
    (
      dados.totalPages > 0 &&
      dados.number >= dados.totalPages &&
      dados.content.length > 0
    )
  ) {
    throw new Error('O backend retornou uma página de quarentena inválida.')
  }

  return dados
}

function parametros(filtros, ordenacao) {
  const params = {
    page: inteiro(filtros.page, 0, 0, Number.MAX_SAFE_INTEGER),
    size: inteiro(filtros.size, 20, 1, 100),
    sort: ordenacao,
  }

  if (filtros.conjuntoId != null && filtros.conjuntoId !== '') {
    params.conjuntoId = validarIdQuarentena(filtros.conjuntoId)
  }

  return params
}

export const quarentenaService = {
  listarExecucoes(filtros = {}, { signal } = {}) {
    return executarConsultaQuarentena(async () => {
      const params = parametros(filtros, 'inicio,desc')

      const { data } = await api.get(`${BASE}/execucoes`, {
        params,
        signal,
      })

      validarPaginaQuarentena(data, params.page)

      data.content.forEach(item => {
        validarIdQuarentena(item?.id)
      })

      return data
    })
  },

  listarRegistros(execucaoId, filtros = {}, { signal } = {}) {
    return executarConsultaQuarentena(async () => {
      const params = parametros(filtros, 'dataRegistro,desc')

      params.execucaoId = validarIdQuarentena(execucaoId)

      if (filtros.situacao) {
        const situacao = String(filtros.situacao).trim().toUpperCase()

        if (!['PENDENTE', 'CORRIGIDO', 'DESCARTADO'].includes(situacao)) {
          throw new Error('Selecione uma situação de quarentena válida.')
        }

        params.situacao = situacao
      }

      const { data } = await api.get(`${BASE}/quarentena`, {
        params,
        signal,
      })

      validarPaginaQuarentena(data, params.page)

      data.content.forEach(item => {
        validarIdQuarentena(item?.quarentenaId)

        if (validarIdQuarentena(item?.execucaoId) !== params.execucaoId) {
          throw new Error('A API retornou registros de outra execução.')
        }
      })

      return data
    })
  },

  consultarRegistro(registroId, { registro, signal } = {}) {
    return executarConsultaQuarentena(async () => {
      if (signal?.aborted) {
        const erro = new Error('Consulta cancelada.')
        erro.name = 'AbortError'
        throw erro
      }

      const id = validarIdQuarentena(registroId)

      if (!registro || validarIdQuarentena(registro.quarentenaId) !== id) {
        throw new Error(
          'Selecione novamente o registro na listagem de quarentena.',
        )
      }

      return { ...registro }
    })
  },
}
