function apiNaoConfigurada() {
  //ate configurar os endpoints reais, o painel exibirá a mensagem de API não configurada.
  const erro = new Error(
    'A API de regras ainda não foi configurada.',
  )

  erro.code = 'API_NAO_CONFIGURADA'

  return erro
}

export const regraService = {
  async obterIndicador() {
    throw apiNaoConfigurada()
  },

  async criarVersao() {
    throw apiNaoConfigurada()
  },
}
