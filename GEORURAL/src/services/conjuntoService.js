import api from './api'
import { texto, validarId, validarCampo, exigirFormularioValido } from './cadastroService'

export const periodicidades = [
  { valor: '', nome: 'Não informada' }, { valor: 'DIARIA', nome: 'Diária' },
  { valor: 'SEMANAL', nome: 'Semanal' }, { valor: 'MENSAL', nome: 'Mensal' },
  { valor: 'TRIMESTRAL', nome: 'Trimestral' }, { valor: 'ANUAL', nome: 'Anual' },
  { valor: 'SOB_DEMANDA', nome: 'Sob demanda' }, { valor: 'UNICA', nome: 'Única' },
]

export const camposConjunto = [
  { chave: 'fonteId', titulo: 'Fonte', tipo: 'select', obrigatorio: true },
  { chave: 'nome', titulo: 'Nome do conjunto', limite: 160, obrigatorio: true },
  { chave: 'tipoCamada', titulo: 'Tipo de camada', limite: 30, obrigatorio: true, ajuda: 'Informe o código do tipo de dado, como IMOVEL ou EMBARGO.' },
  { chave: 'srs', titulo: 'Sistema de referência (EPSG)', tipo: 'number', obrigatorio: true, ajuda: 'Informe somente o código numérico, como 4674.' },
  { chave: 'competencia', titulo: 'Competência', limite: 40, obrigatorio: true, ajuda: 'AAAA, AAAA-MM, AAAA-MM-DD ou intervalo AAAA-MM-DD/AAAA-MM-DD.' },
  { chave: 'cobertura', titulo: 'Cobertura', limite: 200, obrigatorio: true },
  { chave: 'periodicidade', titulo: 'Periodicidade', tipo: 'select', obrigatorio: false, opcoes: periodicidades },
  { chave: 'descricao', titulo: 'Descrição', tipo: 'textarea', limite: 400, obrigatorio: false },
  { chave: 'esquemaTecnico', titulo: 'Esquema técnico (JSON)', tipo: 'textarea', limite: 20000, obrigatorio: true, ajuda: 'Informe um objeto JSON. Se utilizar campos, informe uma lista de nomes sem repetição.' },
]

export const sistemasReferencia = [
  { valor: 'EPSG:4674', nome: 'SIRGAS 2000 (EPSG:4674)' },
  { valor: 'EPSG:31982', nome: 'SIRGAS 2000 / UTM 22S (EPSG:31982)' },
  { valor: 'EPSG:4326', nome: 'WGS 84 (EPSG:4326)' },
  { valor: 'EPSG:4618', nome: 'SAD 69 (EPSG:4618)' },
]
export const coberturas = ['Brasil', 'Paraná', 'Região Sul', 'Municipal', 'Outro']
export const formatosApi = ['GeoJSON', 'WFS / GML', 'Shapefile (.zip)']

export function criarFormularioConjunto(conjunto = null, fonteId = '') {
  const cobertura = conjunto?.cobertura ?? ''
  const padronizada = cobertura !== 'Outro' && coberturas.includes(cobertura)
  const srs = conjunto?.srs == null ? '' : `EPSG:${String(conjunto.srs).replace(/^EPSG:/i, '')}`
  return {
    fonteId: conjunto?.fonteId ?? fonteId ?? '',
    nome: conjunto?.nome ?? '', srs,
    cobertura: cobertura ? (padronizada ? cobertura : 'Outro') : '',
    coberturaPersonalizada: padronizada ? '' : cobertura,
    periodicidade: conjunto?.periodicidade ?? '',
    upload: conjunto?.upload ?? true, api: conjunto?.api ?? false,
    endpoint: conjunto?.endpoint ?? '', formatoApi: conjunto?.formatoApi ?? 'GeoJSON',
    autenticacao: '', autenticacaoConfigurada: conjunto?.autenticacaoConfigurada ?? false,
    tipoCamada: conjunto?.tipoCamada, descricao: conjunto?.descricao,
    esquemaTecnico: conjunto?.esquemaTecnico, competencia: conjunto?.competencia,
  }
}

export function conjuntosFornecidos(fonte, conjuntoEmEdicao = null) {
  const nomes = Array.isArray(fonte?.oferece) ? [...fonte.oferece] : []
  if (conjuntoEmEdicao && String(conjuntoEmEdicao.fonteId) === String(fonte?.id)) {
    nomes.push(conjuntoEmEdicao.nome)
  }
  return [...new Set(nomes)]
}

export function selecoesFormularioConjunto(fontes, fonte, conjuntoEmEdicao = null) {
  return [
    { chave: 'fonteId', titulo: 'Fonte', opcoes: fontes.filter((f) => f.ativo).map((f) => ({ valor: f.id, nome: `${f.sigla} — ${f.nome}` })),
      ajuda: fontes.some((f) => f.ativo) ? 'Selecione uma fonte ativa.' : 'Cadastre ou reative uma fonte para continuar.' },
    { chave: 'nome', titulo: 'Conjunto', opcoes: conjuntosFornecidos(fonte, conjuntoEmEdicao).map((nome) => ({ valor: nome, nome })),
      ajuda: 'São exibidos os conjuntos declarados pela fonte. O conjunto atual é preservado na edição.' },
    { chave: 'srs', titulo: 'Sistema de referência', opcoes: sistemasReferencia },
    { chave: 'cobertura', titulo: 'Cobertura', opcoes: coberturas.map((nome) => ({ valor: nome, nome })) },
    { chave: 'periodicidade', titulo: 'Periodicidade', opcoes: periodicidades.filter((p) => p.valor),
      ajuda: 'Frequência de atualização dos dados fornecidos pela fonte.' },
  ]
}

function dadosFormulario(dados) {
  return {
    fonteId: validarId(dados.fonteId), nome: texto(dados.nome),
    srs: Number(String(dados.srs).replace(/^EPSG:/i, '')),
    cobertura: texto(dados.cobertura === 'Outro' ? dados.coberturaPersonalizada : dados.cobertura),
    periodicidade: texto(dados.periodicidade) || null,
    upload: dados.upload, api: dados.api,
    endpoint: dados.api ? texto(dados.endpoint) : null,
    formatoApi: dados.api ? dados.formatoApi : null,
    autenticacao: dados.api && texto(dados.autenticacao) ? dados.autenticacao : null,
    ...(dados.tipoCamada ? { tipoCamada: texto(dados.tipoCamada) } : {}),
    ...(dados.esquemaTecnico ? { esquemaTecnico: dados.esquemaTecnico } : {}),
    ...(dados.competencia ? { competencia: dados.competencia } : {}),
    ...(dados.descricao != null ? { descricao: dados.descricao } : {}),
  }
}

export function validarFormularioConjunto(dados, fontes = [], conjuntos = [], conjuntoEmEdicao = null) {
  const erros = {}
  const fonte = fontes.find((f) => String(f.id) === String(dados.fonteId) && f.ativo)
  if (!fonte) erros.fonteId = 'Selecione uma fonte ativa.'
  if (!texto(dados.nome)) erros.nome = 'Selecione um conjunto.'
  else if (fonte && !conjuntosFornecidos(fonte, conjuntoEmEdicao).includes(dados.nome)) erros.nome = 'O conjunto deve ser fornecido pela fonte selecionada.'
  if (conjuntos.some((c) => String(c.id) !== String(conjuntoEmEdicao?.id) && String(c.fonteId) === String(dados.fonteId) && texto(c.nome).toLocaleLowerCase('pt-BR') === texto(dados.nome).toLocaleLowerCase('pt-BR'))) erros.nome = 'Esse conjunto já está cadastrado para a fonte.'
  if (!sistemasReferencia.some((s) => s.valor === dados.srs)) erros.srs = 'Selecione um sistema de referência válido.'
  if (!coberturas.includes(dados.cobertura)) erros.cobertura = 'Selecione a cobertura do conjunto.'
  if (dados.cobertura === 'Outro') validarCampo(erros, 'coberturaPersonalizada', dados.coberturaPersonalizada, 200, true)
  if (!periodicidades.some((p) => p.valor && p.valor === dados.periodicidade)) erros.periodicidade = 'Selecione uma periodicidade válida.'
  Object.assign(erros, validarEntrada(dados))
  return erros
}

function validarEntrada(dados) {
  const erros = {}
  if (typeof dados.upload !== 'boolean' || typeof dados.api !== 'boolean' || (!dados.upload && !dados.api)) erros.entrada = 'Selecione Upload, API ou ambas as opções.'
  if (dados.api) {
    const endpoint = texto(dados.endpoint)
    try {
      const url = new URL(endpoint)
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password || endpoint.length > 2000) throw new Error()
    } catch { erros.endpoint = 'Informe uma URL HTTP ou HTTPS válida, sem usuário e senha, com até 2000 caracteres.' }
    if (!formatosApi.includes(dados.formatoApi)) erros.formatoApi = 'Selecione um formato válido.'
    if (dados.autenticacao != null && (typeof dados.autenticacao !== 'string' || dados.autenticacao.length > 4000)) erros.autenticacao = 'A autenticação deve ter até 4000 caracteres.'
  }
  return erros
}

function dataValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false
  const [ano, mes, dia] = valor.split('-').map(Number)
  if (ano < 1 || mes < 1 || mes > 12) return false
  const bissexto = ano % 4 === 0 && (ano % 100 !== 0 || ano % 400 === 0)
  const dias = [31, bissexto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return dia >= 1 && dia <= dias[mes - 1]
}

export function competenciaValida(valor) {
  const competencia = texto(valor)
  if (/^\d{4}$/.test(competencia)) return Number(competencia) > 0
  if (/^\d{4}-\d{2}$/.test(competencia)) return dataValida(`${competencia}-01`)
  if (dataValida(competencia)) return true
  const partes = competencia.split('/')
  return partes.length === 2 && partes.every(dataValida) && partes[0] <= partes[1]
}

export function validarConjunto(dados, fontes = [], conjuntos = [], id = null) {
  const erros = {}
  for (const campo of camposConjunto) {
    if (campo.limite) validarCampo(erros, campo.chave, dados[campo.chave], campo.limite, campo.obrigatorio)
  }
  const fonte = fontes.find((f) => String(f.id) === String(dados.fonteId))
  if (!fonte?.ativo) erros.fonteId = 'Selecione uma fonte ativa.'
  const srs = Number(dados.srs)
  if (!Number.isInteger(srs) || srs < 1 || srs > 999999) erros.srs = 'Informe um código EPSG numérico entre 1 e 999999.'
  if (!competenciaValida(dados.competencia)) erros.competencia = 'Informe uma competência com data ou intervalo válido.'
  if (!periodicidades.some((p) => p.valor === (dados.periodicidade || ''))) erros.periodicidade = 'Selecione uma periodicidade válida.'
  try {
    const esquema = JSON.parse(dados.esquemaTecnico)
    if (!esquema || Array.isArray(esquema) || typeof esquema !== 'object' || !Object.keys(esquema).length) throw new Error()
    if (Object.hasOwn(esquema, 'campos')) {
      if (!Array.isArray(esquema.campos) || !esquema.campos.length || esquema.campos.some((c) => typeof c !== 'string' || !c.trim())) throw new Error()
      const nomes = esquema.campos.map((c) => c.trim().toLowerCase())
      if (new Set(nomes).size !== nomes.length) throw new Error()
    }
  } catch { erros.esquemaTecnico = 'Informe um objeto JSON não vazio com campos válidos e sem repetição.' }
  if (conjuntos.some((c) => String(c.id) !== String(id) && String(c.fonteId) === String(dados.fonteId) && texto(c.nome).toLocaleLowerCase('pt-BR') === texto(dados.nome).toLocaleLowerCase('pt-BR'))) {
    erros.nome = 'Já existe um conjunto com esse nome nessa fonte.'
  }
  return erros
}

export function prepararConjunto(dados) {
  if (typeof dados.upload === 'boolean' || typeof dados.api === 'boolean') {
    exigirFormularioValido(validarEntrada(dados))
    const payload = dadosFormulario(dados)
    const erros = {}
    validarCampo(erros, 'nome', payload.nome, 160, true)
    validarCampo(erros, 'cobertura', payload.cobertura, 200, true)
    if (!Number.isInteger(payload.srs) || payload.srs < 1 || payload.srs > 999999) erros.srs = 'Informe um código EPSG válido.'
    if (!periodicidades.some((p) => p.valor === (payload.periodicidade || ''))) erros.periodicidade = 'Selecione uma periodicidade válida.'
    exigirFormularioValido(erros)
    return payload
  }
  exigirFormularioValido(validarConjunto(dados, [{ id: dados.fonteId, ativo: true }]))
  return {
    fonteId: validarId(dados.fonteId), nome: texto(dados.nome), tipoCamada: texto(dados.tipoCamada).toUpperCase(),
    descricao: texto(dados.descricao) || null, esquemaTecnico: texto(dados.esquemaTecnico),
    srs: Number(dados.srs), competencia: texto(dados.competencia), cobertura: texto(dados.cobertura),
    periodicidade: texto(dados.periodicidade) || null,
  }
}

export function adaptarConjunto(dado) {
  if (!dado || typeof dado.situacao !== 'string' || typeof dado.ativo !== 'boolean') throw new Error('A API retornou um conjunto inválido.')
  return { ...dado, id: validarId(dado.id), fonteId: validarId(dado.fonteId),
    ativo: dado.situacao !== 'ARQUIVADO', disponivel: dado.ativo, cadastradoEm: dado.dataCadastro }
}

export function conjuntosParaUpload(conjuntos, fontes, fonteId) {
  const fonte = fontes.find((f) => String(f.id) === String(fonteId) && f.ativo)
  return fonte ? conjuntos.filter((c) => String(c.fonteId) === String(fonte.id) && c.ativo && c.upload !== false) : []
}

export const conjuntoService = {
  async listar({ signal } = {}) {
    const { data } = await api.get('/api/conjuntos', { signal })
    if (!Array.isArray(data)) throw new Error('A API retornou uma lista de conjuntos inválida.')
    return data.map(adaptarConjunto)
  },
  async salvar(dados) {
    const payload = prepararConjunto(dados)
    const { data } = dados.id == null
      ? await api.post('/api/conjuntos', payload)
      : await api.put(`/api/conjuntos/${validarId(dados.id)}`, payload)
    return adaptarConjunto(data)
  },
  async alterarStatus(conjunto) {
    const id = validarId(conjunto.id)
    if (conjunto.ativo) { await api.delete(`/api/conjuntos/${id}`); return { ...conjunto, situacao: 'ARQUIVADO', ativo: false, disponivel: false } }
    const { data } = await api.patch(`/api/conjuntos/${id}/reativar`)
    return adaptarConjunto(data)
  },
}
export function criarDadosConjunto(
  formulario,
  catalogo = [],
  registroAtual = null,
) {
  const tipo = catalogo.find(
    (item) => item.nome === formulario.nome,
  )

  return {
    ...formulario,
    ...(tipo ? { tipoCamada: tipo.codigo } : {}),
    ...(registroAtual?.id != null
      ? { id: registroAtual.id }
      : {}),
  }
}
