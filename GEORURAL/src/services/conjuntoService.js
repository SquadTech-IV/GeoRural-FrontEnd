import api from './api'

import {
  texto,
  validarId,
  validarCampo,
  exigirFormularioValido,
} from './cadastroService'

import { tiposConjunto } from './catalogoConjuntoService'

export const periodicidades = [
  { valor: '', nome: 'Não informada' },
  { valor: 'DIARIA', nome: 'Diária' },
  { valor: 'SEMANAL', nome: 'Semanal' },
  { valor: 'MENSAL', nome: 'Mensal' },
  { valor: 'TRIMESTRAL', nome: 'Trimestral' },
  { valor: 'ANUAL', nome: 'Anual' },
  { valor: 'SOB_DEMANDA', nome: 'Sob demanda' },
  { valor: 'UNICA', nome: 'Única' },
]

export const sistemasReferencia = [
  { valor: 'EPSG:4674', nome: 'SIRGAS 2000 (EPSG:4674)' },
  {
    valor: 'EPSG:31982',
    nome: 'SIRGAS 2000 / UTM 22S (EPSG:31982)',
  },
  { valor: 'EPSG:4326', nome: 'WGS 84 (EPSG:4326)' },
  { valor: 'EPSG:4618', nome: 'SAD 69 (EPSG:4618)' },
]

export const coberturas = [
  'Brasil',
  'Paraná',
  'Região Sul',
  'Municipal',
  'Outro',
]

export const formatosApi = [
  'GeoJSON',
  'WFS / GML',
  'Shapefile (.zip)',
]

export const camposConjunto = [
  {
    chave: 'fonteId',
    titulo: 'Fonte',
    tipo: 'select',
    obrigatorio: true,
  },
  {
    chave: 'nome',
    titulo: 'Nome do conjunto',
    limite: 160,
    obrigatorio: true,
  },
  {
    chave: 'tipoCamada',
    titulo: 'Tipo de camada',
    limite: 30,
    obrigatorio: true,
  },
  {
    chave: 'srs',
    titulo: 'Sistema de referência (EPSG)',
    tipo: 'number',
    obrigatorio: true,
  },
  {
    chave: 'competencia',
    titulo: 'Competência',
    limite: 20,
    obrigatorio: false,
    ajuda: 'Informação pertencente à versão do conjunto.',
  },
  {
    chave: 'cobertura',
    titulo: 'Cobertura',
    limite: 30,
    obrigatorio: true,
  },
  {
    chave: 'periodicidade',
    titulo: 'Periodicidade',
    tipo: 'select',
    obrigatorio: false,
    opcoes: periodicidades,
  },
  {
    chave: 'descricao',
    titulo: 'Descrição',
    tipo: 'textarea',
    limite: 400,
    obrigatorio: false,
  },
  {
    chave: 'esquemaTecnico',
    titulo: 'Esquema técnico (JSON)',
    tipo: 'textarea',
    limite: 20000,
    obrigatorio: false,
    ajuda: 'O backend utiliza o esquema do tipo cadastrado.',
  },
]

function mesmoId(a, b) {
  return a != null && b != null && String(a) === String(b)
}

function normalizar(valor) {
  return texto(valor).toLocaleLowerCase('pt-BR')
}

export function criarFormularioConjunto(
  conjunto = null,
  fonteId = '',
) {
  const cobertura = conjunto?.cobertura ?? ''
  const padronizada =
    cobertura !== 'Outro' && coberturas.includes(cobertura)

  return {
    fonteId: conjunto?.fonteId ?? fonteId ?? '',
    nome: conjunto?.nome ?? '',
    srs: conjunto?.srs == null
      ? ''
      : `EPSG:${String(conjunto.srs).replace(/^EPSG:/i, '')}`,
    cobertura: cobertura
      ? padronizada ? cobertura : 'Outro'
      : '',
    coberturaPersonalizada: padronizada ? '' : cobertura,
    periodicidade: conjunto?.periodicidade ?? '',
    upload: conjunto?.upload ?? true,
    api: conjunto?.api ?? false,
    endpoint: conjunto?.endpoint ?? '',
    formatoApi: conjunto?.formatoApi ?? 'GeoJSON',
    autenticacao: '',
    autenticacaoConfigurada:
      conjunto?.autenticacaoConfigurada ?? false,
    tipoCamada: conjunto?.tipoCamada,
    descricao: conjunto?.descricao,
    esquemaTecnico: conjunto?.esquemaTecnico,
    competencia: conjunto?.competencia,
  }
}

export function conjuntosFornecidos(
  fonte,
  conjuntoEmEdicao = null,
  catalogo = tiposConjunto,
  conjuntos = [],
) {
  if (!fonte?.ativo) return []

  if (
    conjuntoEmEdicao &&
    mesmoId(conjuntoEmEdicao.fonteId, fonte.id)
  ) {
    return [conjuntoEmEdicao.nome]
  }

  return catalogo
    .filter(tipo =>
      !conjuntos.some(conjunto =>
        mesmoId(conjunto.fonteId, fonte.id) &&
        (
          conjunto.tipoCamada === tipo.codigo ||
          normalizar(conjunto.nome) === normalizar(tipo.nome)
        ),
      ),
    )
    .map(tipo => tipo.nome)
}

export function selecoesFormularioConjunto(
  fontes,
  fonte,
  conjuntoEmEdicao = null,
  catalogo = tiposConjunto,
  conjuntos = [],
) {
  return [
    {
      chave: 'fonteId',
      titulo: 'Fonte',
      opcoes: fontes
        .filter(item => item.ativo)
        .map(item => ({
          valor: item.id,
          nome: `${item.sigla} — ${item.nome}`,
        })),
      ajuda: 'Selecione uma fonte ativa.',
    },
    {
      chave: 'nome',
      titulo: 'Conjunto',
      opcoes: conjuntosFornecidos(
        fonte,
        conjuntoEmEdicao,
        catalogo,
        conjuntos,
      ).map(nome => ({ valor: nome, nome })),
      ajuda: conjuntoEmEdicao
        ? 'A fonte e o tipo existentes devem ser preservados.'
        : 'Tipos disponíveis para cadastro nesta fonte.',
    },
    {
      chave: 'srs',
      titulo: 'Sistema de referência',
      opcoes: sistemasReferencia,
    },
    {
      chave: 'cobertura',
      titulo: 'Cobertura',
      opcoes: coberturas.map(nome => ({ valor: nome, nome })),
    },
    {
      chave: 'periodicidade',
      titulo: 'Periodicidade',
      opcoes: periodicidades.filter(item => item.valor),
      ajuda: 'Frequência de atualização dos dados da fonte.',
    },
  ]
}

function validarEntrada(dados) {
  const erros = {}

  if (
    typeof dados.upload !== 'boolean' ||
    typeof dados.api !== 'boolean' ||
    (!dados.upload && !dados.api)
  ) {
    erros.entrada = 'Selecione Upload, API ou ambas as opções.'
  }

  if (!dados.api) return erros

  const endpoint = texto(dados.endpoint)

  try {
    const url = new URL(endpoint)

    if (
      !['http:', 'https:'].includes(url.protocol) ||
      !url.hostname ||
      url.username ||
      url.password ||
      endpoint.length > 500
    ) {
      throw new Error('Endpoint inválido.')
    }
  } catch {
    erros.endpoint =
      'Informe uma URL HTTP ou HTTPS válida, sem usuário e senha, com até 500 caracteres.'
  }

  if (!formatosApi.includes(dados.formatoApi)) {
    erros.formatoApi = 'Selecione um formato válido.'
  }

  if (
    dados.autenticacao != null &&
    (
      typeof dados.autenticacao !== 'string' ||
      dados.autenticacao.length > 4000
    )
  ) {
    erros.autenticacao =
      'A autenticação deve ter até 4000 caracteres.'
  }

  return erros
}

export function validarFormularioConjunto(
  dados,
  fontes = [],
  conjuntos = [],
  conjuntoEmEdicao = null,
  catalogo = tiposConjunto,
) {
  const erros = {}

  const fonte = fontes.find(item =>
    mesmoId(item.id, dados.fonteId) && item.ativo,
  )

  if (!fonte) {
    erros.fonteId = 'Selecione uma fonte ativa.'
  }

  if (
    conjuntoEmEdicao &&
    !mesmoId(dados.fonteId, conjuntoEmEdicao.fonteId)
  ) {
    erros.fonteId =
      'A fonte não pode ser alterada. Cadastre outro conjunto.'
  }

  const disponiveis = conjuntosFornecidos(
    fonte,
    conjuntoEmEdicao,
    catalogo,
    conjuntos,
  )

  if (!texto(dados.nome)) {
    erros.nome = 'Selecione um conjunto.'
  } else if (fonte && !disponiveis.includes(dados.nome)) {
    erros.nome = 'Selecione um tipo disponível para esta fonte.'
  }

  if (
    conjuntos.some(item =>
      !mesmoId(item.id, conjuntoEmEdicao?.id) &&
      mesmoId(item.fonteId, dados.fonteId) &&
      normalizar(item.nome) === normalizar(dados.nome),
    )
  ) {
    erros.nome = 'Esse conjunto já está cadastrado para a fonte.'
  }

  if (!sistemasReferencia.some(item => item.valor === dados.srs)) {
    erros.srs = 'Selecione um sistema de referência válido.'
  }

  if (!coberturas.includes(dados.cobertura)) {
    erros.cobertura = 'Selecione a cobertura do conjunto.'
  }

  if (dados.cobertura === 'Outro') {
    validarCampo(
      erros,
      'coberturaPersonalizada',
      dados.coberturaPersonalizada,
      30,
      true,
    )
  }

  if (
    !periodicidades.some(item =>
      item.valor && item.valor === dados.periodicidade,
    )
  ) {
    erros.periodicidade = 'Selecione uma periodicidade válida.'
  }

  Object.assign(erros, validarEntrada(dados))

  return erros
}

function dataValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false

  const [ano, mes, dia] = valor.split('-').map(Number)
  if (ano < 1 || mes < 1 || mes > 12) return false

  const bissexto =
    ano % 4 === 0 && (ano % 100 !== 0 || ano % 400 === 0)

  const dias = [
    31, bissexto ? 29 : 28, 31, 30, 31, 30,
    31, 31, 30, 31, 30, 31,
  ]

  return dia >= 1 && dia <= dias[mes - 1]
}

export function competenciaValida(valor) {
  const competencia = texto(valor)

  if (/^\d{4}$/.test(competencia)) {
    return Number(competencia) > 0
  }

  if (/^\d{4}-\d{2}$/.test(competencia)) {
    return dataValida(`${competencia}-01`)
  }

  if (dataValida(competencia)) return true

  const partes = competencia.split('/')

  return (
    partes.length === 2 &&
    partes.every(dataValida) &&
    partes[0] <= partes[1]
  )
}

export function validarConjunto(
  dados,
  fontes = [],
  conjuntos = [],
  id = null,
) {
  const erros = {}

  validarCampo(erros, 'nome', dados.nome, 160, true)
  validarCampo(erros, 'tipoCamada', dados.tipoCamada, 30, true)
  validarCampo(erros, 'cobertura', dados.cobertura, 30, true)
  validarCampo(erros, 'descricao', dados.descricao, 400, false)

  if (!fontes.some(item => mesmoId(item.id, dados.fonteId) && item.ativo)) {
    erros.fonteId = 'Selecione uma fonte ativa.'
  }

  const srs = Number(String(dados.srs).replace(/^EPSG:/i, ''))

  if (!Number.isInteger(srs) || srs < 1 || srs > 999999) {
    erros.srs = 'Informe um código EPSG válido.'
  }

  if (
    !periodicidades.some(item =>
      item.valor === (dados.periodicidade || ''),
    )
  ) {
    erros.periodicidade = 'Selecione uma periodicidade válida.'
  }

  if (
    conjuntos.some(item =>
      !mesmoId(item.id, id) &&
      mesmoId(item.fonteId, dados.fonteId) &&
      normalizar(item.nome) === normalizar(dados.nome),
    )
  ) {
    erros.nome = 'Já existe um conjunto com esse nome nessa fonte.'
  }

  return erros
}

export function criarDadosConjunto(
  formulario,
  catalogo = tiposConjunto,
  registroAtual = null,
) {
  const tipo = catalogo.find(item =>
    item.nome === formulario.nome,
  )

  return {
    ...formulario,
    tipoCamada: registroAtual?.tipoCamada ??
      tipo?.codigo ??
      formulario.tipoCamada,
    ...(registroAtual?.id != null
      ? { id: registroAtual.id }
      : {}),
  }
}

export function prepararConjunto(dados) {
  const tipo = tiposConjunto.find(item =>
    item.nome === dados.nome,
  )

  const payload = {
    fonteId: validarId(dados.fonteId),
    nome: texto(dados.nome),
    tipoCamada: texto(dados.tipoCamada || tipo?.codigo).toUpperCase(),
    descricao: texto(dados.descricao) || null,
    srs: Number(String(dados.srs).replace(/^EPSG:/i, '')),
    cobertura: texto(
      dados.cobertura === 'Outro'
        ? dados.coberturaPersonalizada
        : dados.cobertura,
    ),
    periodicidade: texto(dados.periodicidade) || null,
    upload: dados.upload ?? true,
    api: dados.api ?? false,
    endpoint: dados.api ? texto(dados.endpoint) : null,
    formatoApi: dados.api ? dados.formatoApi : null,
    autenticacao: dados.api && texto(dados.autenticacao)
      ? dados.autenticacao
      : null,
  }

  exigirFormularioValido({
    ...validarConjunto(
      payload,
      [{ id: payload.fonteId, ativo: true }],
    ),
    ...validarEntrada(payload),
  })

  return payload
}

export function adaptarConjunto(dado) {
  if (
    !dado ||
    typeof dado.situacao !== 'string' ||
    typeof dado.ativo !== 'boolean'
  ) {
    throw new Error('A API retornou um conjunto inválido.')
  }

  const ativo =
    dado.ativo && dado.situacao !== 'ARQUIVADO'

  return {
    ...dado,
    id: validarId(dado.id),
    fonteId: validarId(dado.fonteId),
    ativo,
    disponivel: ativo,
    cadastradoEm: dado.dataCadastro,
  }
}

export function conjuntosParaUpload(conjuntos, fontes, fonteId) {
  const fonte = fontes.find(item =>
    mesmoId(item.id, fonteId) && item.ativo,
  )

  return fonte
    ? conjuntos.filter(item =>
        mesmoId(item.fonteId, fonte.id) &&
        item.ativo &&
        item.upload === true,
      )
    : []
}

export const conjuntoService = {
  async listar({ signal } = {}) {
    const { data } = await api.get('/api/conjuntos', { signal })

    if (!Array.isArray(data)) {
      throw new Error('A API retornou uma lista de conjuntos inválida.')
    }

    return data.map(adaptarConjunto)
  },

  async salvar(dados) {
    const payload = prepararConjunto(dados)

    const { data } = dados.id == null
      ? await api.post('/api/conjuntos', payload)
      : await api.put(
          `/api/conjuntos/${validarId(dados.id)}`,
          payload,
        )

    return adaptarConjunto(data)
  },

  async alterarStatus(conjunto) {
    const id = validarId(conjunto.id)

    if (conjunto.ativo) {
      await api.delete(`/api/conjuntos/${id}`)

      return {
        ...conjunto,
        situacao: 'ARQUIVADO',
        ativo: false,
        disponivel: false,
      }
    }

    const { data } = await api.patch(
      `/api/conjuntos/${id}/reativar`,
    )

    return adaptarConjunto(data)
  },
}
