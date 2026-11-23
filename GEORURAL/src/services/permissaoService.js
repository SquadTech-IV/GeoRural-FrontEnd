export const PERFIS = Object.freeze([
  'ADMIN',
  'GESTOR',
  'OPERADOR',
  'ANALISTA',
  'AUDITOR',
])

const GESTAO = ['ADMIN', 'GESTOR']
const OPERACAO = ['ADMIN', 'GESTOR', 'OPERADOR']
const QUALIDADE = ['ADMIN', 'GESTOR', 'OPERADOR', 'AUDITOR']

const capacidades = {
  consultar: PERFIS,
  gerir: GESTAO,
  operar: OPERACAO,
  qualidade: QUALIDADE,
  administrar: ['ADMIN'],
}

export function extrairPerfil(claims) {
  const roles = claims?.realm_access?.roles

  const perfis = new Set(
    (Array.isArray(roles) ? roles : [])
      .map((role) =>
        String(role)
          .trim()
          .toUpperCase()
          .replace(/^ROLE_/, ''),
      )
      .filter((role) => PERFIS.includes(role)),
  )

  if (perfis.size !== 1) {
    throw new Error(
      'Sua conta deve possuir exatamente um perfil do GeoRural. Contate o administrador.',
    )
  }

  return [...perfis][0]
}

export function possuiPermissao(perfil, capacidade = 'consultar') {
  return capacidades[capacidade]?.includes(perfil) ?? false
}

export function permissaoRota(nome) {
  if (nome === 'GestaoUsuarios') {
    return 'administrar'
  }

  if (
    [
      'QuarentenaDados',
      'AuditoriaDados',
      'AuditoriaLinhagem',
    ].includes(nome)
  ) {
    return 'qualidade'
  }

  if (nome === 'Ingestao') {
    return 'operar'
  }

  if (nome === 'RegraNovaVersao') {
    return 'gerir'
  }

  return 'consultar'
}

export function perfisRequisicao(metodo, caminho) {
  const verbo = String(metodo).toUpperCase()
  const rota = String(caminho)
    .split('?')[0]
    .replace(/\/$/, '')

  if (
    /^\/api\/usuarios(?:\/|$)/.test(rota) ||
    /^\/api\/teste(?:\/|$)/.test(rota) ||
    (
      verbo === 'POST' &&
      rota === '/api/pipeline/limite-territorial/recarregar'
    )
  ) {
    return ['ADMIN']
  }

  if (
    (
      ['POST', 'PUT', 'DELETE', 'PATCH'].includes(verbo) &&
      /^\/api\/fontes(?:\/|$)/.test(rota)
    ) ||
    (
      ['DELETE', 'PATCH'].includes(verbo) &&
      /^\/api\/conjuntos(?:\/|$)/.test(rota)
    ) ||
    (
      verbo === 'POST' &&
      /^\/api\/versoes\/[^/]+\/(publicar|reprovar|reverter)$/.test(rota)
    ) ||
    (
      verbo === 'POST' &&
      /^\/api\/indicadores(?:\/|$)/.test(rota)
    ) ||
    (
      verbo === 'PUT' &&
      /^\/api\/imoveis\/[^/]+\/nome$/.test(rota)
    )
  ) {
    return GESTAO
  }

  if (
    (
      ['POST', 'PUT'].includes(verbo) &&
      /^\/api\/conjuntos(?:\/|$)/.test(rota)
    ) ||
    (
      verbo === 'POST' &&
      /^\/api\/ingestao(?:\/|$)/.test(rota)
    ) ||
    (
      verbo === 'POST' &&
      rota === '/api/arquivos/brutos/upload'
    ) ||
    (
      verbo === 'POST' &&
      /^\/api\/arquivos\/[^/]+\/processar$/.test(rota)
    ) ||
    (
      verbo === 'POST' &&
      /^\/api\/pipeline\/(executar|lote|etapas(?:\/.*)?|execucoes\/[^/]+\/etapas\/[^/]+\/reexecutar)$/.test(
        rota,
      )
    ) ||
    (
      verbo === 'PATCH' &&
      /^\/api\/v1\/qualidade(?:\/|$)/.test(rota)
    )
  ) {
    return OPERACAO
  }

  if (
    verbo === 'GET' &&
    (
      /^\/api\/(?:v1\/)?(?:linhagem|qualidade)(?:\/|$)/.test(rota) ||
      rota === '/api/v1/auditoria' ||
      /^\/api\/execucoes\/[^/]+\/qualidade$/.test(rota)
    )
  ) {
    return QUALIDADE
  }

  if (
    verbo === 'GET' &&
    /^\/api\/(?:v1\/(?:catalogo|indicadores|execucoes)|indicadores|imoveis|mapa|arquivos|inventario|perfis|datalake|conjuntos|fontes|versoes|trajetoria-conjuntos|zona-tratada|ingestao|pipeline)(?:\/|$)/.test(
      rota,
    )
  ) {
    return PERFIS
  }

  return []
}

export function caminhoRetornoSeguro(valor) {
  if (
    typeof valor !== 'string' ||
    !valor.startsWith('/') ||
    valor.startsWith('//') ||
    /[\\\r\n]/.test(valor)
  ) {
    return '/imoveis'
  }

  const url = new URL(valor, 'https://georural.local')

  if (
    url.origin !== 'https://georural.local' ||
    ['/', '/login', '/sem-acesso'].includes(url.pathname)
  ) {
    return '/imoveis'
  }

  return url.pathname + url.search + url.hash
}
