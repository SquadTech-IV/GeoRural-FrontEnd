import api from './api'

export const OPERACOES_AUDITORIA = {
  INSERT: 'Criou',
  UPDATE: 'Alterou',
  DELETE: 'Apagou',
  UPLOAD: 'Enviou arquivo',
  EXECUCAO: 'Disparou execução',
  LOGIN: 'Entrou',
  LOGOUT: 'Saiu',
  EXPORT: 'Exportou',
  DOWNLOAD: 'Baixou',
  API_ACCESS: 'Chamou a API',
  DESATIVACAO: 'Desativou',
  REATIVACAO: 'Reativou',
  REENVIO_CONVITE: 'Reenviou convite',
  ATUALIZACAO_SITUACAO: 'Mudou a situação',
  ACESSO_NEGADO: 'Acesso negado',
}
export const ENTIDADES_AUDITORIA = [
  'VERSAO',
  'REGRA_CALCULO',
  'PARAMETRO_REGRA_CALCULO',
  'ARQUIVO_BRUTO',
  'CONJUNTO_DADOS',
  'EXECUCAO_PIPELINE',
  'USUARIO',
  'FONTE_DO_DADO',
]

export function consultaHistoricoCancelada(erro) {
  return erro?.code === 'ERR_CANCELED' || erro?.name === 'AbortError'
}

export function mensagemErroHistorico(erro) {
  const status = erro?.response?.status
  if (status === 401) return 'Entre com uma conta autorizada para consultar o histórico de ações.'
  if (status === 403) return 'O histórico de ações está disponível somente para o perfil AUDITOR.'
  if (erro?.code === 'ECONNABORTED' || status === 504)
    return 'A consulta demorou demais. Tente novamente.'
  if (erro?.isAxiosError && !erro.response)
    return 'Não foi possível acessar o backend. Verifique a conexão.'
  if (status === 404) return 'O serviço de histórico de ações não foi encontrado no backend.'
  if (status >= 500) return 'O servidor não conseguiu consultar o histórico de ações.'
  return (
    erro?.response?.data?.mensagem ||
    erro?.response?.data?.message ||
    erro?.message ||
    'Não foi possível consultar o histórico.'
  )
}

export function validarIdHistorico(valor) {
  const texto = String(valor ?? '').trim()
  if (!/^[1-9]\d*$/.test(texto) || (typeof valor === 'number' && !Number.isSafeInteger(valor)))
    throw new Error('Informe um identificador válido.')
  return texto
}

function lerEstado(valor) {
  if (valor == null || valor === '') return null
  let dado = valor
  if (typeof valor === 'string') {
    try {
      dado = JSON.parse(valor)
    } catch {
      return { conteudoOriginal: valor }
    }
  }
  if (dado === null) return { valor: null }
  if (Array.isArray(dado)) return { itens: dado }
  return typeof dado === 'object' ? dado : { valor: dado }
}

export function normalizarEventoAuditoria(dado) {
  if (!dado || typeof dado !== 'object' || !dado.acao || !dado.entidade)
    throw new Error('O backend retornou um evento de auditoria inválido.')
  const operacao = String(dado.acao).trim().toUpperCase()
  const antigos = lerEstado(dado.dadosAntigos)
  const novos = lerEstado(dado.dadosNovos)
  return {
    id: validarIdHistorico(dado.id),
    operacao,
    entidade: dado.entidade,
    registroId: dado.registroId,
    quando: dado.dataHora,
    antigos,
    novos,
    resumo: `${OPERACOES_AUDITORIA[operacao] || operacao} · ${dado.entidade}${dado.registroId != null ? ` #${dado.registroId}` : ''}`,
    usuario: {
      id: dado.usuarioId == null ? null : validarIdHistorico(dado.usuarioId),
      nome: dado.usuarioNome || 'Responsável não informado',
      ip: dado.ip || null,
      automatico: dado.usuarioId == null && String(dado.usuarioNome).toUpperCase() === 'AIRFLOW',
    },
    marco: dado.entidade === 'VERSAO' && novos?.situacao === 'VIGENTE',
  }
}

export function prepararDetalheAuditoria(evento) {
  return {
    rot: OPERACOES_AUDITORIA[evento?.operacao] || evento?.operacao || '',
    lados: ['antigos', 'novos'].filter((lado) => evento?.[lado] != null),
    chaves: [
      ...new Set([...Object.keys(evento?.antigos ?? {}), ...Object.keys(evento?.novos ?? {})]),
    ],
  }
}

export function prepararHistorico(
  eventos,
  { entidade = '', busca = '', arquivoBrutoId = '' } = {},
) {
  const termo = String(busca).trim().toLocaleLowerCase('pt-BR')
  const lista = eventos
    .filter((e) => {
      if (entidade && e.entidade !== entidade) return false
      if (
        arquivoBrutoId &&
        !(
          (e.entidade === 'ARQUIVO_BRUTO' && String(e.registroId) === String(arquivoBrutoId)) ||
          [e.antigos?.arquivoBrutoId, e.novos?.arquivoBrutoId].some(
            (valor) => valor != null && String(valor) === String(arquivoBrutoId),
          )
        )
      )
        return false
      return (
        !termo ||
        `${e.usuario.nome} ${e.usuario.ip ?? ''} ${e.operacao} ${e.entidade} ${e.registroId ?? ''} ${JSON.stringify(e.antigos)} ${JSON.stringify(e.novos)}`
          .toLocaleLowerCase('pt-BR')
          .includes(termo)
      )
    })
    .sort((a, b) => (new Date(b.quando).getTime() || 0) - (new Date(a.quando).getTime() || 0))
  const porDia = new Map()
  for (const evento of lista) {
    const dataRef = evento.quando ? new Date(evento.quando) : new Date(NaN)
    const chave = Number.isFinite(dataRef.getTime())
      ? `${dataRef.getFullYear()}-${dataRef.getMonth()}-${dataRef.getDate()}`
      : 'sem-data'
    if (!porDia.has(chave)) porDia.set(chave, { chave, dataRef, itens: [] })
    porDia.get(chave).itens.push(evento)
  }
  const responsaveis = new Map()
  for (const e of eventos) if (e.usuario.id != null) responsaveis.set(e.usuario.id, e.usuario)
  return {
    eventosFiltrados: lista,
    gruposPorDia: [...porDia.values()],
    eventoMaisAntigo: lista.at(-1) ?? null,
    responsaveisDisponiveis: [...responsaveis.values()],
    resumo: {
      total: lista.length,
      mudancas: lista.filter((e) => ['INSERT', 'UPDATE', 'DELETE'].includes(e.operacao)).length,
      responsaveisUnicos: new Set(
        lista.map((e) => (e.usuario.id != null ? `id:${e.usuario.id}` : `nome:${e.usuario.nome}`)),
      ).size,
      peloAirflow: lista.filter((e) => e.usuario.automatico).length,
      exclusoes: lista.filter((e) => e.operacao === 'DELETE').length,
    },
  }
}

function dataLocal(data) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`
}

export function criarHistoricoAcoesService(cliente = api) {
  return {
    async listar(
      { dias = 7, acao = '', usuarioId = '', pagina = 0, tamanho = 20, agora = new Date() } = {},
      { signal } = {},
    ) {
      if (
        ![0, 1, 7, 30].includes(dias) ||
        !Number.isSafeInteger(pagina) ||
        pagina < 0 ||
        !Number.isSafeInteger(tamanho) ||
        tamanho < 1 ||
        tamanho > 100
      )
        throw new Error('Os filtros de período ou paginação são inválidos.')
      const params = {
        page: pagina,
        size: tamanho,
        sort: 'dataHora,desc',
        acao: acao.trim().toUpperCase() || undefined,
        usuarioId: usuarioId ? validarIdHistorico(usuarioId) : undefined,
      }
      if (dias) {
        const inicio = new Date(agora)
        inicio.setDate(inicio.getDate() - dias + 1)
        params.de = dataLocal(inicio)
        params.ate = dataLocal(agora)
      }
      const { data } = await cliente.get('/api/v1/auditoria', { signal, params })
      if (
        !data ||
        !Array.isArray(data.itens) ||
        data.pagina !== pagina ||
        !Number.isSafeInteger(data.totalItens) ||
        data.totalItens < 0 ||
        !Number.isSafeInteger(data.totalPaginas) ||
        data.totalPaginas < 0 ||
        !Number.isSafeInteger(data.tamanho) ||
        data.tamanho < 1 ||
        data.itens.length > data.tamanho ||
        data.itens.length > data.totalItens
      )
        throw new Error('O backend retornou uma página de auditoria inválida.')
      return {
        eventos: data.itens.map(normalizarEventoAuditoria),
        pagina: data.pagina,
        tamanho: data.tamanho,
        total: data.totalItens,
        totalPaginas: data.totalPaginas,
      }
    },
  }
}
export const historicoAcoesService = criarHistoricoAcoesService()