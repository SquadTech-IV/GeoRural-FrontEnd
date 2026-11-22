import { possuiPermissao, permissaoRota, caminhoRetornoSeguro } from './permissaoService'

export function criarGuardaAutenticacao(autenticacao) {
  return async (to) => {
    if (to.meta.publica) {
      if (to.name === 'Login' && autenticacao.estado.autenticado)
        return caminhoRetornoSeguro(to.query.retorno)
      return true
    }
    try {
      await autenticacao.obterToken()
    } catch {
      return { name: 'Login', query: { retorno: caminhoRetornoSeguro(to.fullPath) }, replace: true }
    }
    if (!possuiPermissao(autenticacao.estado.perfil, permissaoRota(to.name)))
      return { name: 'SemAcesso', replace: true }
    return true
  }
}
