import api from './api'

const ZONAS = [
  'BRUTA',
  'QUARENTENA',
  'TRATADA',
  'PUBLICADA',
]

const STATUS = [
  'done',
  'atual',
  'ressalva',
  'pendente',
]

const NOMES_STATUS = {
  done: 'Concluída',
  atual: 'Em andamento',
  ressalva: 'Com ressalva',
  pendente: 'Pendente',
}

function validarId(valor) {
  const id = String(valor ?? '').trim()

  if (
    !/^[1-9]\d*$/.test(id) ||
    (
      typeof valor === 'number' &&
      !Number.isSafeInteger(valor)
    )
  ) {
    throw new Error('Informe um identificador válido.')
  }

  return id
}

function formatarData(valor) {
  if (!valor) return 'Não informada'

  const data = new Date(valor)

  return Number.isNaN(data.getTime())
    ? String(valor)
    : data.toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
}

function validarObjeto(valor) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    throw new Error('A API retornou uma trajetória inválida.')
  }

  return valor
}

function normalizarArquivo(dado, conjuntoId, conjuntoNome) {
  validarObjeto(dado)

  const id = validarId(dado.arquivoId)

  if (!Array.isArray(dado.passagens)) {
    throw new Error('O arquivo não possui uma lista válida de passagens.')
  }

  const zonas = new Set()

  const passagens = dado.passagens.map(passagem => {
    validarObjeto(passagem)

    if (
      !ZONAS.includes(passagem.zona) ||
      !STATUS.includes(passagem.status) ||
      zonas.has(passagem.zona)
    ) {
      throw new Error('O arquivo contém passagens inválidas ou repetidas.')
    }

    zonas.add(passagem.zona)

    return {
      ...passagem,
      count: passagem.contagem ?? '',
      obs: passagem.observacao ?? '',
    }
  })

  if (
    dado.zonaAtual != null &&
    !ZONAS.includes(dado.zonaAtual)
  ) {
    throw new Error('O arquivo possui uma zona atual inválida.')
  }

  const eventos = passagens
    .filter(passagem => passagem.quando != null)
    .map(passagem => ({
      chave: `${id}:${passagem.zona}`,
      arquivoNome: dado.nome,
      zona: passagem.zona,
      tipo: 'Passagem de zona',
      status: NOMES_STATUS[passagem.status],
      dataHora: passagem.quando,
      descricao: passagem.observacao ?? '',
      contagem: passagem.contagem ?? '',
      titulo: `${passagem.zona} · ${NOMES_STATUS[passagem.status]}`,
      dataFormatada: formatarData(passagem.quando),
    }))

  return {
    ...dado,
    id,
    conjuntoId,
    conjuntoNome,
    passagens,
    eventos,
  }
}

export function normalizarTrajetoria(dados) {
  validarObjeto(dados)

  const conjuntoId = validarId(dados.conjuntoId)
  const conjuntoNome = String(dados.conjuntoNome ?? '')

  if (!Array.isArray(dados.arquivos)) {
    throw new Error('A API retornou uma lista de arquivos inválida.')
  }

  const arquivos = dados.arquivos.map(arquivo =>
    normalizarArquivo(arquivo, conjuntoId, conjuntoNome),
  )

  if (new Set(arquivos.map(arquivo => arquivo.id)).size !== arquivos.length) {
    throw new Error('A API retornou arquivos repetidos.')
  }

  return {
    ...dados,
    conjuntoId,
    conjuntoNome,
    arquivos,
  }
}

export function prepararDetalheEvento(evento) {
  return [
    {
      titulo: 'Arquivo',
      valor: evento.arquivoNome || 'Não informado',
    },
    {
      titulo: 'Zona',
      valor: evento.zona || 'Não informada',
    },
    {
      titulo: 'Data',
      valor: formatarData(evento.dataHora),
    },
    {
      titulo: 'Situação',
      valor: evento.status || 'Não informada',
    },
    {
      titulo: 'Contagem',
      valor: evento.contagem || 'Não informada',
    },
    {
      titulo: 'Observação',
      valor: evento.descricao || 'Sem observação.',
    },
  ]
}

export const rastreabilidadeService = {
  async listarConjuntos({ signal } = {}) {
    const { data } = await api.get(
      '/api/trajetoria-conjuntos/resumo',
      { signal },
    )

    if (!Array.isArray(data)) {
      throw new Error('A API retornou uma lista de conjuntos inválida.')
    }

    return data.map(item => ({
      ...item,
      id: validarId(item.id),
      nome: String(item.rotulo ?? ''),
    }))
  },

  async consultarTrajetoria(conjuntoId, { signal } = {}) {
    const id = validarId(conjuntoId)

    const { data } = await api.get(
      `/api/trajetoria-conjuntos/${id}/arquivos-trajetoria`,
      { signal },
    )

    const resposta = normalizarTrajetoria(data)

    if (resposta.conjuntoId !== id) {
      throw new Error('A API retornou a trajetória de outro conjunto.')
    }

    return resposta
  },
}
