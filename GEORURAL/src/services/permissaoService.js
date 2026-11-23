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

// Capacidade exigida por tela. Derivado da matriz do SecurityConfig do back:
// cada tela recebe a regra da acao principal que ela executa, para a tela nunca
// aparecer oferecendo algo que a API vai recusar com 403.
const CAPACIDADE_POR_ROTA = {
  // administrar - so ADMIN
  GestaoUsuarios: 'administrar',          // /api/usuarios/** e hasRole(ADMIN)
  MonitoramentoPlataforma: 'administrar', // expoe rotas, mensagens de erro e IP de origem

  // gerir - ADMIN e GESTOR
  Cadastros: 'gerir',              // POST/PUT/DELETE /api/fontes e GESTAO
  Regras: 'gerir',                 // POST /api/indicadores/** e GESTAO
  RegraNovaVersao: 'gerir',
  RegraDetalheVersao: 'gerir',
  RegraCompararVersoes: 'gerir',

  // operar - ADMIN, GESTOR e OPERADOR
  Ingestao: 'operar',              // POST /api/ingestao/** e OPERACAO_E_INGESTAO
  ProcessarDados: 'operar',        // POST /api/arquivos/*/processar
  PainelOperacao: 'operar',        // POST /api/pipeline/etapas/**

  // qualidade - ADMIN, GESTOR, OPERADOR e AUDITOR (bloqueia ANALISTA)
  QuarentenaDados: 'qualidade',    // GET /api/v1/qualidade/**
  QualidadeDados: 'qualidade',
  AuditoriaDados: 'qualidade',     // GET /api/linhagem/**
  AuditoriaLinhagem: 'qualidade',  // GET /api/v1/auditoria

  // consultar - os cinco perfis; todas sao leitura liberada a TODOS_PERFIS no back
  ArquivosRecebidos: 'consultar',
  DetalheArquivoRecebido: 'consultar',
  ZonaTratadaDados: 'consultar',
  Indicadores: 'consultar',
  MapaIndicadores: 'consultar',
  CompararVersoes: 'consultar',
  Imoveis: 'consultar',
  ComparacaoMunicipios: 'consultar',
  Rastreabilidade: 'consultar',
  SemAcesso: 'consultar',
}

export function permissaoRota(nome) {
  return CAPACIDADE_POR_ROTA[nome] ?? 'consultar'
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
    /^\/api\/(?:v1\/(?:catalogo|indicadores|execucoes|iapp)|indicadores|imoveis|mapa|arquivos|inventario|perfis|datalake|conjuntos|fontes|versoes|trajetoria-conjuntos|zona-tratada|ingestao|pipeline)(?:\/|$)/.test(
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
