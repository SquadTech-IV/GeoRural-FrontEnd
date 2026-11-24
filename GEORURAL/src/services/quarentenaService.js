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

// O back devolve o envelope de paginacao em portugues (PaginaResponse: itens,
// pagina, tamanho, totalItens, totalPaginas). Este validador conferia os nomes
// do Spring Data em ingles (content, number, size, totalElements, totalPages),
// que nenhuma rota do projeto devolve. A primeira checagem falhava sempre,
// entao a tela de quarentena nunca carregou, em nenhuma situacao.
export function validarPaginaQuarentena(dados, pagina) {
  if (
    !dados ||
    !Array.isArray(dados.itens) ||
    !Number.isSafeInteger(dados.pagina) ||
    dados.pagina !== pagina ||
    !Number.isSafeInteger(dados.totalItens) ||
    dados.totalItens < 0 ||
    !Number.isSafeInteger(dados.totalPaginas) ||
    dados.totalPaginas < 0 ||
    !Number.isSafeInteger(dados.tamanho) ||
    dados.tamanho < 1 ||
    dados.itens.length > dados.tamanho ||
    dados.itens.length > dados.totalItens ||
    (
      dados.totalPaginas > 0 &&
      dados.pagina >= dados.totalPaginas &&
      dados.itens.length > 0
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

      data.itens.forEach(item => {
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

      data.itens.forEach(item => {
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