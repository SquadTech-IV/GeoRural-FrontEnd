import api from './api'

import {
  executarConsultaQuarentena,
} from './quarentenaErroService'

export {
  mensagemErroQuarentena,
  requisicaoQuarentenaCancelada,
} from './quarentenaErroService'

let rotasConfiguradas = null

export function validarIdQuarentena(valor) {
  if (
    typeof valor === 'number' &&
    !Number.isSafeInteger(valor)
  ) {
    throw new Error(
      'O identificador informado é inválido.',
    )
  }

  const id = String(valor ?? '').trim()

  if (!/^[1-9]\d*$/.test(id)) {
    throw new Error(
      'Informe um identificador válido.',
    )
  }

  return id
}

function validarCaminho(caminho) {
  if (
    typeof caminho !== 'string' ||
    !caminho.startsWith('/') ||
    caminho.startsWith('//')
  ) {
    throw new Error(
      'A rota de quarentena configurada é inválida.',
    )
  }

  return caminho
}

export function configurarRotasQuarentena(rotas) {
  if (
    !rotas ||
    typeof rotas.execucoes !== 'string' ||
    typeof rotas.registros !== 'function' ||
    typeof rotas.detalhe !== 'function'
  ) {
    throw new Error(
      'Configure as rotas de execuções, registros e detalhes da quarentena.',
    )
  }

  validarCaminho(rotas.execucoes)

  rotasConfiguradas = {
    execucoes: rotas.execucoes,
    registros: rotas.registros,
    detalhe: rotas.detalhe,
  }
}

function obterCaminho(tipo, id) {
  if (!rotasConfiguradas) {
    throw new Error(
      'As rotas da quarentena ainda não foram configuradas com os endpoints do backend.',
    )
  }

  const rota = rotasConfiguradas[tipo]

  return validarCaminho(
    typeof rota === 'function'
      ? rota(id)
      : rota,
  )
}

function validarObjeto(dados) {
  if (
    !dados ||
    typeof dados !== 'object' ||
    Array.isArray(dados)
  ) {
    throw new Error(
      'O backend retornou um registro de quarentena inválido.',
    )
  }

  return dados
}

function validarLista(dados) {
  if (Array.isArray(dados)) {
    return dados
  }

  if (
    dados &&
    typeof dados === 'object' &&
    Array.isArray(dados.content)
  ) {
    return dados
  }

  throw new Error(
    'O backend retornou uma listagem de quarentena inválida.',
  )
}

function executarConsulta(
  tipo,
  {
    id,
    params,
    signal,
    validar,
  },
) {
  return executarConsultaQuarentena(async () => {
    const identificador = id === undefined
      ? undefined
      : validarIdQuarentena(id)

    const caminho = obterCaminho(
      tipo,
      identificador,
    )

    const { data } = await api.get(caminho, {
      params,
      signal,
      timeout: 30000,
    })

    return validar(data)
  })
}

export const quarentenaService = {
  listarExecucoes(
    filtros = {},
    { signal } = {},
  ) {
    return executarConsulta('execucoes', {
      params: filtros,
      signal,
      validar: validarLista,
    })
  },

  listarRegistros(
    execucaoId,
    filtros = {},
    { signal } = {},
  ) {
    return executarConsulta('registros', {
      id: execucaoId,
      params: filtros,
      signal,
      validar: validarLista,
    })
  },

  consultarRegistro(
    registroId,
    { signal } = {},
  ) {
    return executarConsulta('detalhe', {
      id: registroId,
      signal,
      validar: validarObjeto,
    })
  },
}
