import { arquivoService } from './arquivoService'

import { executarOperacaoArquivo } from './arquivoRecebidoErroService'

export { consultaArquivoCancelada } from './arquivoRecebidoErroService'

function validarId(valor) {
  if (typeof valor === 'number' && !Number.isSafeInteger(valor)) {
    throw new Error('O identificador do arquivo é inválido.')
  }

  const id = String(valor ?? '').trim()

  if (!/^[1-9]\d*$/.test(id)) {
    throw new Error('Selecione um arquivo válido.')
  }

  return id
}

function validarObjeto(valor, mensagem) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    throw new Error(mensagem)
  }
}

function adaptarResumo(dado) {
  validarObjeto(dado, 'O backend retornou um arquivo inválido.')

  return {
    ...dado,
    id: validarId(dado.id),
  }
}

function adaptarDetalhe(dado) {
  const arquivo = adaptarResumo(dado)

  if (dado.arquivos != null && !Array.isArray(dado.arquivos)) {
    throw new Error('O backend retornou uma lista de itens inválida.')
  }

  return {
    ...arquivo,
    arquivos: (dado.arquivos ?? []).map((item) => {
      validarObjeto(item, 'O backend retornou um item de arquivo inválido.')

      return {
        ...item,
        id: validarId(item.id),
      }
    }),
  }
}

export function formatarDataRecebimento(valor) {
  if (!valor) return 'Não informado'

  const data = new Date(valor)

  if (Number.isNaN(data.getTime())) {
    return String(valor)
  }

  return data.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export function formatarTamanhoArquivo(valor) {
  if (valor == null || valor === '') {
    return 'Não informado'
  }

  const bytes = Number(valor)

  if (!Number.isFinite(bytes) || bytes < 0) {
    return 'Não informado'
  }

  const unidades = ['B', 'KB', 'MB', 'GB', 'TB']

  let tamanho = bytes
  let unidade = 0

  while (tamanho >= 1024 && unidade < unidades.length - 1) {
    tamanho /= 1024
    unidade++
  }

  const numero = tamanho.toLocaleString('pt-BR', {
    maximumFractionDigits: unidade === 0 ? 0 : 1,
  })

  return `${numero} ${unidades[unidade]}`
}

export const arquivosRecebidosService = {
  listar({ nome = '', situacao = '', signal } = {}) {
    return executarOperacaoArquivo(async () => {
      const filtroNome = String(nome ?? '').trim()

      const filtroSituacao = String(situacao ?? '')
        .trim()
        .toUpperCase()

      const data = await arquivoService.listar(filtroNome, filtroSituacao, { signal })

      if (!Array.isArray(data)) {
        throw new Error('O backend retornou uma lista de arquivos inválida.')
      }

      return data.map(adaptarResumo)
    }, 'listar')
  },

  consultarDetalhe(id, { signal } = {}) {
    return executarOperacaoArquivo(async () => {
      const arquivoId = validarId(id)

      const data = await arquivoService.detalhe(arquivoId, { signal })

      return adaptarDetalhe(data)
    }, 'detalhe')
  },

  baixarOriginal(id, { signal } = {}) {
    return executarOperacaoArquivo(async () => {
      const arquivoId = validarId(id)

      const data = await arquivoService.baixarOriginal(arquivoId, { signal })

      if (!(data instanceof Blob)) {
        throw new Error('O servidor retornou um conteúdo inválido para download.')
      }

      return data
    }, 'download')
  },
}
