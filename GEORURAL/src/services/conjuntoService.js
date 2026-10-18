import api from './api'
import {
  texto,
  validarId,
  validarCampo,
  exigirFormularioValido,
} from './cadastroService'

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
    ajuda:
      'Informe o código do tipo de dado, como IMOVEL ou EMBARGO.',
  },
  {
    chave: 'srs',
    titulo: 'Sistema de referência (EPSG)',
    tipo: 'number',
    obrigatorio: true,
    ajuda: 'Informe somente o código numérico, como 4674.',
  },
  {
    chave: 'competencia',
    titulo: 'Competência',
    limite: 40,
    obrigatorio: true,
    ajuda:
      'AAAA, AAAA-MM, AAAA-MM-DD ou intervalo AAAA-MM-DD/AAAA-MM-DD.',
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
    obrigatorio: true,
    ajuda:
      'Informe um objeto JSON. Se utilizar campos, informe uma lista de nomes sem repetição.',
  },
]

export function criarFormularioConjunto(
  conjunto = null,
  fonteId = '',
) {
  return Object.fromEntries(
    camposConjunto.map((campo) => [
      campo.chave,
      conjunto?.[campo.chave] ??
        (
          campo.chave === 'fonteId'
            ? fonteId ?? ''
            : ''
        ),
    ]),
  )
}

function dataValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false
  }

  const [ano, mes, dia] = valor.split('-').map(Number)

  if (ano < 1 || mes < 1 || mes > 12) {
    return false
  }

  const bissexto =
    ano % 4 === 0 &&
    (ano % 100 !== 0 || ano % 400 === 0)

  const dias = [
    31,
    bissexto ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
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

  if (dataValida(competencia)) {
    return true
  }

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

  for (const campo of camposConjunto) {
    if (campo.limite) {
      validarCampo(
        erros,
        campo.chave,
        dados[campo.chave],
        campo.limite,
        campo.obrigatorio,
      )
    }
  }

  const fonte = fontes.find(
    (item) => String(item.id) === String(dados.fonteId),
  )

  if (!fonte?.ativo) {
    erros.fonteId = 'Selecione uma fonte ativa.'
  }

  const srs = Number(dados.srs)

  if (
    !Number.isInteger(srs) ||
    srs < 1 ||
    srs > 999999
  ) {
    erros.srs =
      'Informe um código EPSG numérico entre 1 e 999999.'
  }

  if (!competenciaValida(dados.competencia)) {
    erros.competencia =
      'Informe uma competência com data ou intervalo válido.'
  }

  if (
    !periodicidades.some(
      (item) =>
        item.valor === (dados.periodicidade || ''),
    )
  ) {
    erros.periodicidade =
      'Selecione uma periodicidade válida.'
  }

  try {
    const esquema = JSON.parse(dados.esquemaTecnico)

    if (
      !esquema ||
      Array.isArray(esquema) ||
      typeof esquema !== 'object' ||
      !Object.keys(esquema).length
    ) {
      throw new Error()
    }

    if (Object.hasOwn(esquema, 'campos')) {
      if (
        !Array.isArray(esquema.campos) ||
        !esquema.campos.length ||
        esquema.campos.some(
          (campo) =>
            typeof campo !== 'string' ||
            !campo.trim(),
        )
      ) {
        throw new Error()
      }

      const nomes = esquema.campos.map(
        (campo) => campo.trim().toLowerCase(),
      )

      if (new Set(nomes).size !== nomes.length) {
        throw new Error()
      }
    }
  } catch {
    erros.esquemaTecnico =
      'Informe um objeto JSON não vazio com campos válidos e sem repetição.'
  }

  const duplicado = conjuntos.some(
    (conjunto) =>
      String(conjunto.id) !== String(id) &&
      String(conjunto.fonteId) === String(dados.fonteId) &&
      texto(conjunto.nome).toLocaleLowerCase('pt-BR') ===
        texto(dados.nome).toLocaleLowerCase('pt-BR'),
  )

  if (duplicado) {
    erros.nome =
      'Já existe um conjunto com esse nome nessa fonte.'
  }

  return erros
}

export function prepararConjunto(dados) {
  exigirFormularioValido(
    validarConjunto(
      dados,
      [{ id: dados.fonteId, ativo: true }],
    ),
  )

  return {
    fonteId: validarId(dados.fonteId),
    nome: texto(dados.nome),
    tipoCamada: texto(dados.tipoCamada).toUpperCase(),
    descricao: texto(dados.descricao) || null,
    esquemaTecnico: texto(dados.esquemaTecnico),
    srs: Number(dados.srs),
    competencia: texto(dados.competencia),
    cobertura: texto(dados.cobertura),
    periodicidade: texto(dados.periodicidade) || null,
  }
}

export function adaptarConjunto(dado) {
  if (
    !dado ||
    typeof dado.situacao !== 'string' ||
    typeof dado.ativo !== 'boolean'
  ) {
    throw new Error(
      'A API retornou um conjunto inválido.',
    )
  }

  return {
    ...dado,
    id: validarId(dado.id),
    fonteId: validarId(dado.fonteId),
    ativo: dado.situacao !== 'ARQUIVADO',
    disponivel: dado.ativo,
    cadastradoEm: dado.dataCadastro,
  }
}

export function conjuntosParaUpload(
  conjuntos,
  fontes,
  fonteId,
) {
  const fonte = fontes.find(
    (item) =>
      String(item.id) === String(fonteId) &&
      item.ativo,
  )

  return fonte
    ? conjuntos.filter(
        (conjunto) =>
          String(conjunto.fonteId) === String(fonte.id) &&
          conjunto.ativo,
      )
    : []
}

export const conjuntoService = {
  async listar({ signal } = {}) {
    const { data } = await api.get('/api/conjuntos', {
      signal,
    })

    if (!Array.isArray(data)) {
      throw new Error(
        'A API retornou uma lista de conjuntos inválida.',
      )
    }

    return data.map(adaptarConjunto)
  },

  async salvar(dados) {
    const payload = prepararConjunto(dados)

    const resposta = dados.id == null
      ? await api.post('/api/conjuntos', payload)
      : await api.put(
          `/api/conjuntos/${validarId(dados.id)}`,
          payload,
        )

    return adaptarConjunto(resposta.data)
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
