export function mensagemErro(erro) {
  const dados = erro?.response?.data

  const mensagem =
    typeof dados?.mensagem === 'string' ? dados.mensagem.trim()
      : typeof dados?.message === 'string' ? dados.message.trim()
        : ''

  if (mensagem) return mensagem

  if (erro?.isAxiosError && !erro.response) {
    return 'Não foi possível acessar o backend. Verifique se ele está em execução.'
  }

  if (erro?.response?.status === 404) return 'Não foi encontrado no servidor.'
  if (erro?.response?.status >= 500) return 'O servidor não conseguiu concluir a operação.'

  return erro?.message || 'Não foi possível concluir a operação.'
}

export async function requisitar(operacao) {
  try {
    return await operacao()
  } catch (erro) {
    throw new Error(mensagemErro(erro), { cause: erro })
  }
}

export class ErroDeValidacao extends Error {
  constructor(mensagem) {
    super(mensagem)
    this.name = 'ErroDeValidacao'
    this.validacao = true
  }
}
