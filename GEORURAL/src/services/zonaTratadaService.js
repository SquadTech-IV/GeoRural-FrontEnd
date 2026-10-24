import api from './api'

// Contratos de ConjuntoController e ConjuntoDadosController.
const ROTAS = {
  conjuntos: '/api/conjuntos',
  trajetoria: (id) => `/api/conjuntos/${id}/arquivos-trajetoria`,
}

export function requisicaoZonaTratadaCancelada(erro) {
  return (
    erro?.code === 'ERR_CANCELED' || erro?.name === 'CanceledError' || erro?.name === 'AbortError'
  )
}

export function validarIdZonaTratada(valor) {
  if (typeof valor === 'number' && !Number.isSafeInteger(valor)) {
    throw new Error('O identificador informado é inválido.')
  }

  const id = String(valor ?? '').trim()

  if (!/^[1-9]\d*$/.test(id)) {
    throw new Error('Informe um identificador válido.')
  }

  return id
}

function validarLista(dados) {
  if (Array.isArray(dados)) {
    return dados
  }

  if (dados && typeof dados === 'object' && Array.isArray(dados.content)) {
    return dados
  }

  throw new Error('O backend retornou uma listagem da zona tratada inválida.')
}

function validarObjeto(dados) {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
    throw new Error('O backend retornou informações de processamento inválidas.')
  }

  return dados
}

export function mensagemErroZonaTratada(erro) {
  if (requisicaoZonaTratadaCancelada(erro)) {
    return ''
  }

  if (typeof erro === 'string') {
    return erro.trim() || 'Não foi possível consultar a zona tratada.'
  }

  const status = erro?.response?.status

  if (status === 401) {
    return 'Sua sessão não está autorizada. Entre novamente no sistema.'
  }

  if (status === 403) {
    return 'Você não possui permissão para consultar a zona tratada.'
  }

  if (status === 404) {
    return 'O registro ou o serviço da zona tratada não foi encontrado.'
  }

  if (
    status === 408 ||
    status === 504 ||
    erro?.code === 'ECONNABORTED' ||
    erro?.code === 'ETIMEDOUT'
  ) {
    return 'A consulta demorou mais que o permitido. Tente novamente.'
  }

  if (status === 429) {
    return 'Muitas consultas foram realizadas. Aguarde um momento e tente novamente.'
  }

  if (erro?.isAxiosError && !erro.response) {
    return 'Não foi possível acessar o backend. Verifique a conexão e tente novamente.'
  }

  if (status >= 500) {
    return 'O servidor não conseguiu consultar a zona tratada. Tente novamente mais tarde.'
  }

  const dados = erro?.response?.data

  const mensagemServidor =
    typeof dados?.mensagem === 'string'
      ? dados.mensagem.trim()
      : typeof dados?.message === 'string'
        ? dados.message.trim()
        : ''

  if (status >= 400 && status < 500 && mensagemServidor) {
    return mensagemServidor
  }

  if (status === 400 || status === 422) {
    return 'Os parâmetros da consulta são inválidos. Confira os dados informados.'
  }

  if (!erro?.isAxiosError && typeof erro?.message === 'string' && erro.message.trim()) {
    return erro.message.trim()
  }

  return 'Não foi possível consultar a zona tratada.'
}

async function consultar(rota, { signal, params } = {}) {
  const { data } = await api.get(rota, { signal, params, timeout: 30000 })
  return data
}

async function executar(operacao) {
  try {
    return await operacao()
  } catch (erro) {
    if (requisicaoZonaTratadaCancelada(erro)) throw erro
    throw new Error(mensagemErroZonaTratada(erro), { cause: erro })
  }
}

function lista(dados) {
  const resposta = validarLista(dados)
  return Array.isArray(resposta) ? resposta : resposta.content
}

export const zonaTratadaService = {
  listarConjuntos(filtros = {}, { signal } = {}) {
    return executar(async () => {
      const conjuntos = lista(await consultar(ROTAS.conjuntos, { signal }))
      const tratados = []
      for (const conjunto of conjuntos) {
        validarObjeto(conjunto)
        const id = validarIdZonaTratada(conjunto.id)
        const trajetoria = validarObjeto(await consultar(ROTAS.trajetoria(id), { signal }))
        if (
          validarIdZonaTratada(trajetoria.conjuntoId) !== id ||
          !Array.isArray(trajetoria.arquivos)
        ) {
          throw new Error('O backend retornou uma trajetória de conjunto inválida.')
        }
        const arquivos = trajetoria.arquivos.filter((arquivo) => {
          validarObjeto(arquivo)
          if (!Array.isArray(arquivo.passagens))
            throw new Error('O backend retornou passagens de zona inválidas.')
          return arquivo.passagens.some(
            (passagem) => passagem.zona === 'TRATADA' && passagem.quando != null,
          )
        })
        if (!arquivos.length) continue
        tratados.push({
          conjuntoId: id,
          conjuntoNome: trajetoria.conjuntoNome ?? conjunto.nome,
          fonteNome: conjunto.fonteNome,
          tipoNome: conjunto.tipoCamada,
          competencia: conjunto.competencia,
          situacao: 'TRATADA',
          arquivos,
        })
      }
      const busca = String(filtros.busca ?? '')
        .trim()
        .toLocaleLowerCase('pt-BR')
      return tratados.filter(
        (item) =>
          !busca ||
          [item.conjuntoNome, item.fonteNome, item.tipoNome, item.competencia].some((valor) =>
            String(valor ?? '')
              .toLocaleLowerCase('pt-BR')
              .includes(busca),
          ),
      )
    })
  },

  consultarTransformacoes() {
    return Promise.reject(
      new Error(
        'O backend ainda não disponibiliza uma consulta definitiva de transformações por execução.',
      ),
    )
  },

  consultarProcessamento() {
    return Promise.reject(
      new Error(
        'O backend ainda não disponibiliza uma consulta definitiva de processamento por execução.',
      ),
    )
  },
}
