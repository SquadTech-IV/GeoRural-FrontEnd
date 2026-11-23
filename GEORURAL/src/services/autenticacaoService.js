import axios from 'axios'
import { reactive, readonly } from 'vue'
import { extrairPerfil } from './permissaoService'

export function mensagemAutenticacao(erro) {
  const dados = erro?.response?.data
  if (dados?.error === 'invalid_grant')
    return 'E-mail ou senha inválidos, ou conta indisponível. Confira seus dados.'
  if (['unauthorized_client', 'invalid_client'].includes(dados?.error))
    return 'O serviço de login não está configurado para acesso pela tela do GeoRural. Contate o administrador.'
  if (erro?.response?.status === 401)
    return 'A conta não foi autorizada pelo GeoRural. Verifique o cadastro, o status e o perfil com o administrador.'
  if (erro?.response?.status === 403) return 'Sua conta não possui acesso ao GeoRural.'
  if (erro?.code === 'ECONNABORTED')
    return 'O serviço de login demorou para responder. Tente novamente.'
  if (erro?.response?.status >= 500)
    return 'O serviço de login está indisponível. Tente novamente mais tarde.'
  if (erro?.isAxiosError && !erro.response)
    return 'Não foi possível acessar o serviço de login. Tente novamente.'
  return erro?.message || 'Não foi possível entrar. Tente novamente.'
}

function lerClaims(token) {
  try {
    const parte = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(
      new TextDecoder().decode(Uint8Array.from(atob(parte), (c) => c.charCodeAt(0))),
    )
  } catch {
    throw new Error('O serviço de login retornou uma sessão inválida.')
  }
}

export function criarAutenticacao({
  cliente = axios.create({ timeout: 15000 }),
  baseAuth = import.meta.env.VITE_AUTH_URL || '/auth',
  realm = import.meta.env.VITE_KEYCLOAK_REALM || 'georural',
  clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'georural-cli',
  baseApi = import.meta.env.VITE_API_URL || '/',
  agora = () => Date.now(),
} = {}) {
  const estado = reactive({
    autenticado: false,
    nome: '',
    perfil: '',
    mensagem: '',
    aviso: '',
    versao: 0,
  })
  let acesso = null
  let renovacao = null
  let expiraEm = 0
  let renovando = null
  const endpoint = `${baseAuth.replace(/\/$/, '')}/realms/${encodeURIComponent(realm)}/protocol/openid-connect`

  function encerrar(mensagem = '') {
    acesso = null
    renovacao = null
    expiraEm = 0
    renovando = null
    estado.autenticado = false
    estado.nome = ''
    estado.perfil = ''
    estado.mensagem = mensagem
    estado.aviso = ''
    estado.versao++
  }

  function aplicar(dados) {
    if (!dados?.access_token || !dados.refresh_token)
      throw new Error('O serviço de login retornou uma sessão inválida.')
    const claims = lerClaims(dados.access_token)
    const perfil = extrairPerfil(claims)
    if (!claims.sub || !Number.isFinite(claims.exp) || claims.exp * 1000 <= agora())
      throw new Error('A sessão recebida está inválida ou expirada.')
    acesso = dados.access_token
    renovacao = dados.refresh_token
    expiraEm = claims.exp * 1000
    estado.perfil = perfil
    estado.nome = claims.name || claims.preferred_username || claims.email || 'Usuário'
    // Claims servem apenas à interface; assinatura, status e cadastro são validados pela API.
  }

  async function entrar(email, senha, { signal } = {}) {
    if (!String(email ?? '').trim() || !senha) throw new Error('Informe seu e-mail e sua senha.')
    encerrar()
    const versao = estado.versao
    try {
      const corpo = new URLSearchParams({
        grant_type: 'password',
        client_id: clientId,
        username: email.trim(),
        password: senha,
        scope: 'openid',
      })
      const { data } = await cliente.post(`${endpoint}/token`, corpo, { signal })
      if (versao !== estado.versao)
        throw Object.assign(new Error('Login cancelado.'), { code: 'ERR_CANCELED' })
      aplicar(data)
      await cliente.get(`${baseApi.replace(/\/$/, '')}/api/fontes`, {
        signal,
        headers: { Authorization: `Bearer ${acesso}` },
      })
      if (versao !== estado.versao)
        throw Object.assign(new Error('Login cancelado.'), { code: 'ERR_CANCELED' })
      estado.autenticado = true
      estado.mensagem = ''
    } catch (erro) {
      if (versao === estado.versao)
        encerrar(erro.code === 'ERR_CANCELED' ? '' : mensagemAutenticacao(erro))
      if (erro.code === 'ERR_CANCELED') throw erro
      throw new Error(mensagemAutenticacao(erro), { cause: erro })
    }
  }

  async function obterToken() {
    if (!estado.autenticado || !acesso)
      throw Object.assign(new Error('Entre para continuar.'), { code: 'AUTH_REQUIRED' })
    if (expiraEm - agora() > 30000) return acesso
    if (!renovando) {
      const versao = estado.versao
      const tarefa = (async () => {
        try {
          const corpo = new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: clientId,
            refresh_token: renovacao,
          })
          const { data } = await cliente.post(`${endpoint}/token`, corpo)
          if (versao !== estado.versao)
            throw Object.assign(new Error('Sessão encerrada.'), { code: 'ERR_CANCELED' })
          aplicar(data)
          return acesso
        } catch (erro) {
          if (versao === estado.versao)
            encerrar('Sua sessão expirou. Entre novamente para continuar.')
          throw Object.assign(new Error('Sua sessão expirou. Entre novamente para continuar.'), {
            code: 'AUTH_REQUIRED',
            cause: erro,
          })
        }
      })()
      renovando = tarefa
      void tarefa
        .finally(() => {
          if (renovando === tarefa) renovando = null
        })
        .catch(() => {})
    }
    return renovando
  }

  async function sair() {
    const token = renovacao
    encerrar()
    if (!token) return
    try {
      await cliente.post(
        `${endpoint}/logout`,
        new URLSearchParams({ client_id: clientId, refresh_token: token }),
      )
    } catch {
      estado.mensagem =
        'A sessão local foi encerrada. Não foi possível confirmar o encerramento no servidor.'
    }
  }

  return {
    estado: readonly(estado),
    entrar,
    obterToken,
    sair,
    encerrar,
    avisarSemPermissao() {
      estado.aviso = 'Você não possui permissão para realizar esta operação.'
    },
    fecharAviso() {
      estado.aviso = ''
    },
  }
}

export const autenticacaoService = criarAutenticacao()
