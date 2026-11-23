import { perfisRequisicao } from './permissaoService'

export function configurarSegurancaHttp(api, autenticacao) {
  api.interceptors.request.use(async (config) => {
    const url = new URL(
      config.url,
      new URL(config.baseURL || '/', globalThis.location?.origin || 'http://localhost'),
    )
    const base = new URL(config.baseURL || '/', globalThis.location?.origin || 'http://localhost')
    if (url.origin !== base.origin) throw new Error('Destino de requisição não autorizado.')
    const versao = autenticacao.estado.versao
    const token = await autenticacao.obterToken()
    if (versao !== autenticacao.estado.versao)
      throw Object.assign(new Error('Sessão encerrada.'), { code: 'ERR_CANCELED' })
    config.versaoSessao = versao
    if (
      !perfisRequisicao(config.method || 'GET', url.pathname).includes(autenticacao.estado.perfil)
    ) {
      autenticacao.avisarSemPermissao()
      throw Object.assign(new Error('Você não possui permissão para realizar esta operação.'), {
        response: {
          status: 403,
          data: { mensagem: 'Você não possui permissão para realizar esta operação.' },
          config,
        },
      })
    }
    config.headers.set('Authorization', `Bearer ${token}`)
    return config
  })
  api.interceptors.response.use(
    (resposta) => resposta,
    (erro) => {
      if (erro.config?.versaoSessao === autenticacao.estado.versao) {
        if (erro.response?.status === 401)
          autenticacao.encerrar(
            'Sua sessão expirou ou seu acesso não está autorizado. Entre novamente.',
          )
        if (erro.response?.status === 403) autenticacao.avisarSemPermissao()
      }
      return Promise.reject(erro)
    },
  )
}
