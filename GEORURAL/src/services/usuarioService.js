import api from './api'

const BASE = '/api/usuarios'
const descricoes = {
  ADMIN: 'Administra usuários, perfis e configurações da plataforma.',
  GESTOR: 'Gerencia fontes, conjuntos, regras e publicação de dados.',
  OPERADOR: 'Executa ingestão e processamento das cargas permitidas.',
  ANALISTA: 'Consulta imóveis, mapas e indicadores.',
  AUDITOR: 'Consulta dados, qualidade e linhagem sem alterar cadastros.',
}

export function validarIdUsuario(valor) {
  if ((typeof valor === 'number' && !Number.isSafeInteger(valor)) || !/^[1-9]\d*$/.test(String(valor ?? ''))) {
    throw new Error('Informe um identificador válido.')
  }
  return String(valor)
}

export function consultaUsuarioCancelada(erro) {
  return erro?.code === 'ERR_CANCELED' || erro?.name === 'AbortError'
}

export function mensagemErroUsuario(erro, escrita = false) {
  const status = erro?.response?.status
  if (status === 401) return 'Sua sessão expirou ou seu acesso foi revogado. Entre novamente.'
  if (status === 403) return 'Somente administradores podem gerenciar usuários.'
  if (['ECONNABORTED', 'ETIMEDOUT'].includes(erro?.code) || status === 504) return escrita
    ? 'A resposta demorou demais. Atualize a lista e confira o resultado antes de repetir a operação.'
    : 'A consulta demorou demais. Tente novamente.'
  if (erro?.isAxiosError && !erro.response) return escrita
    ? 'A conexão foi interrompida. Confira o resultado antes de repetir a operação.'
    : 'Não foi possível acessar o backend. Verifique a conexão.'
  const dados = erro?.response?.data
  const mensagem = dados?.mensagem ?? dados?.message
  if (status >= 400 && status < 500 && typeof mensagem === 'string') return mensagem
  if (status === 404) return 'Usuário ou serviço de gestão de usuários não encontrado.'
  if (status >= 500) return escrita
    ? 'O servidor não conseguiu confirmar a operação. Atualize a lista antes de tentar novamente.'
    : 'O servidor não conseguiu consultar os usuários.'
  return erro?.message || 'Não foi possível concluir a operação.'
}

function objeto(dado) {
  if (!dado || typeof dado !== 'object' || Array.isArray(dado)) throw new Error('Resposta de usuários inválida.')
  return dado
}

export function normalizarUsuario(dado) {
  objeto(dado)
  const id = validarIdUsuario(dado.id)
  if (!['S', 'N'].includes(dado.status)) throw new Error('O backend retornou um status de usuário inválido.')
  return {
    ...dado, id, perfilId: validarIdUsuario(dado.perfilId),
    ativo: dado.status === 'S', perfil: dado.perfilNome || dado.perfilFuncao,
    iniciais: String(dado.nome ?? '').trim().split(/\s+/).slice(0, 2).map(p => p[0] ?? '').join('').toUpperCase(),
    ultimoAcesso: formatarDataUsuario(dado.ultimoLogin, 'Nunca acessou'),
    convitePendente: typeof dado.convitePendente === 'boolean' ? dado.convitePendente : null,
  }
}

export function formatarDataUsuario(valor, padrao = 'Não informado') {
  const data = valor ? new Date(valor) : null
  return data && Number.isFinite(data.getTime()) ? data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : padrao
}

export function prepararFormularioUsuario(dados, perfis, usuario = null) {
  const nome = String(dados.nome ?? '').trim().replace(/\s+/g, ' ')
  if (!nome || nome.length > 120) throw new Error('Informe um nome com até 120 caracteres.')
  const perfilId = validarIdUsuario(dados.perfilId)
  if (!perfis.some(p => String(p.id) === perfilId)) throw new Error('Selecione um perfil disponível.')
  if (usuario) {
    const payload = {}
    if (nome !== usuario.nome) payload.nome = nome
    if (perfilId !== String(usuario.perfilId)) payload.perfilId = perfilId
    if (!Object.keys(payload).length) throw new Error('Nenhuma alteração foi informada.')
    return payload
  }
  const email = String(dados.email ?? '').trim().toLowerCase()
  if (email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Informe um e-mail válido com até 160 caracteres.')
  return { nome, email, perfilId }
}

export function podeReenviarConvite(usuario) {
  // Listagem/detalhe omitem a pendência; a API confirma se UPDATE_PASSWORD ainda existe.
  return usuario?.ativo === true && usuario.convitePendente !== false
}

export function prepararConfirmacaoUsuario(tipo, usuario) {
  if (!['status', 'convite'].includes(tipo)) throw new Error('Ação de usuário inválida.')
  if (tipo === 'convite') return {
    titulo: 'Reenviar convite', rotulo: 'Reenviar convite', processando: 'Enviando...',
    mensagem: `Reenviar o e-mail de definição de senha para ${usuario.email}?`,
    aviso: 'O envio será permitido somente se a conta estiver ativa e ainda precisar definir a senha inicial.',
  }
  const acao = usuario.ativo ? 'Desativar' : 'Reativar'
  return { titulo: `${acao} usuário`, rotulo: `${acao} usuário`, processando: `${usuario.ativo ? 'Desativando' : 'Reativando'}...`,
    mensagem: `${acao} o acesso de ${usuario.nome}?`,
    aviso: usuario.ativo ? 'As sessões ativas deste usuário serão revogadas.' : 'O usuário poderá acessar novamente com seu perfil atual.',
  }
}

export function criarUsuarioService(cliente = api) {
  return {
    async listar(filtros = {}, { signal } = {}) {
      const pagina = filtros.pagina ?? 0
      const tamanho = filtros.tamanho ?? 20
      if (!Number.isSafeInteger(pagina) || pagina < 0 || !Number.isSafeInteger(tamanho) || tamanho < 1 || tamanho > 100) throw new Error('Paginação de usuários inválida.')
      if (filtros.status && !['S', 'N'].includes(filtros.status)) throw new Error('Status de usuário inválido.')
      const params = { page: pagina, size: tamanho, sort: 'nome,asc', busca: filtros.busca?.trim() || undefined,
        perfilId: filtros.perfilId ? validarIdUsuario(filtros.perfilId) : undefined, status: filtros.status || undefined }
      const { data } = await cliente.get(BASE, { signal, params })
      objeto(data)
      if (!Array.isArray(data.itens) || data.pagina !== pagina || !Number.isSafeInteger(data.totalItens) || data.totalItens < 0 ||
        !Number.isSafeInteger(data.totalPaginas) || data.totalPaginas < 0 || !Number.isSafeInteger(data.tamanho) || data.tamanho < 1 ||
        data.itens.length > data.tamanho || data.itens.length > data.totalItens) throw new Error('O backend retornou uma página de usuários inválida.')
      return { ...data, itens: data.itens.map(normalizarUsuario) }
    },
    async resumo(filtros = {}, { signal } = {}) {
      const [ativos, desativados] = await Promise.all(['S', 'N'].map(status => this.listar({ ...filtros, pagina: 0, tamanho: 1, status }, { signal })))
      return { ativos: ativos.totalItens, desativados: desativados.totalItens, total: ativos.totalItens + desativados.totalItens }
    },
    async perfis({ signal } = {}) {
      const { data } = await cliente.get(`${BASE}/perfis`, { signal })
      if (!Array.isArray(data)) throw new Error('O backend retornou perfis inválidos.')
      return data.map(p => ({ id: validarIdUsuario(p.id), funcao: p.funcao, nome: p.nome || p.funcao, descricao: descricoes[p.funcao] || '' }))
    },
    async detalhar(id, { signal } = {}) {
      const { data } = await cliente.get(`${BASE}/${validarIdUsuario(id)}`, { signal })
      const usuario = normalizarUsuario(data)
      if (usuario.id !== String(id)) throw new Error('O backend retornou um usuário diferente do solicitado.')
      return usuario
    },
    async salvar(dados, perfis, usuario = null) {
      const payload = prepararFormularioUsuario(dados, perfis, usuario)
      const resposta = usuario
        ? await cliente.patch(`${BASE}/${validarIdUsuario(usuario.id)}`, payload)
        : await cliente.post(BASE, payload)
      const confirmado = normalizarUsuario(resposta.data)
      if (usuario && confirmado.id !== String(usuario.id)) throw new Error('Confirmação de alteração inválida. Atualize a lista antes de repetir.')
      return confirmado
    },
    async alterarStatus(usuario) {
      const id = validarIdUsuario(usuario.id)
      const { data } = await cliente.post(`${BASE}/${id}/${usuario.ativo ? 'desativar' : 'reativar'}`)
      const confirmado = normalizarUsuario(data)
      if (confirmado.id !== id || confirmado.ativo === usuario.ativo) throw new Error('Confirmação de status inválida. Atualize a lista antes de repetir.')
      return confirmado
    },
    async reenviarConvite(usuario) {
      if (!podeReenviarConvite(usuario)) throw new Error('O convite só pode ser reenviado para uma conta ativa com definição de senha pendente.')
      const id = validarIdUsuario(usuario.id)
      const { data } = await cliente.post(`${BASE}/${id}/reenviar-convite`)
      const confirmado = normalizarUsuario(data)
      if (confirmado.id !== id || confirmado.convitePendente !== true) throw new Error('Confirmação de convite inválida. Confira o envio antes de repetir.')
      return confirmado
    },
    async divergencias({ signal } = {}) {
      const { data } = await cliente.get(`${BASE}/divergencias`, { signal })
      if (!Array.isArray(data)) throw new Error('O backend retornou divergências inválidas.')
      return data.map(d => ({ ...objeto(d), usuarioId: validarIdUsuario(d.usuarioId) }))
    },
  }
}

export const usuarioService = criarUsuarioService()
