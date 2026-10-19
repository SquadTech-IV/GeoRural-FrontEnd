const ZONAS = [
  { codigo: 'BRUTA', nome: 'Bruta' },
  { codigo: 'QUARENTENA', nome: 'Quarentena' },
  { codigo: 'TRATADA', nome: 'Tratada' },
  { codigo: 'PUBLICADA', nome: 'Publicada' },
]

const SITUACOES = {
  done: {
    nome: 'Concluída',
    icone: '✓',
  },
  ressalva: {
    nome: 'Com ressalva',
    icone: '!',
  },
  atual: {
    nome: 'Em andamento',
    icone: '',
  },
  pendente: {
    nome: 'Pendente',
    icone: '○',
  },
}

function texto(valor) {
  return valor == null ? '' : String(valor).trim()
}

function formatarQuando(valor) {
  const original = texto(valor)

  if (!original) return ''

  if (!/^\d{4}-\d{2}-\d{2}T/.test(original)) {
    return original
  }

  const data = new Date(original)

  if (Number.isNaN(data.getTime())) {
    return original
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data)
}

export function prepararLinhaTempo(trajetoria) {
  if (trajetoria == null) {
    return {
      etapas: [],
      zonaAtual: null,
      emAndamento: false,
      possuiMovimentacoes: false,
      erro: '',
    }
  }

  if (!Array.isArray(trajetoria.passagens)) {
    return resultadoInvalido('A trajetória não possui uma lista válida de passagens.')
  }

  const passagens = new Map()

  for (const passagem of trajetoria.passagens) {
    if (!passagem || typeof passagem !== 'object') {
      return resultadoInvalido('A trajetória contém uma passagem inválida.')
    }

    const zona = texto(passagem.zona).toUpperCase()
    const status = texto(passagem.status).toLowerCase()

    if (!ZONAS.some((item) => item.codigo === zona)) {
      return resultadoInvalido('A trajetória contém uma zona desconhecida.')
    }

    if (!Object.hasOwn(SITUACOES, status)) {
      return resultadoInvalido('A trajetória contém uma situação desconhecida.')
    }

    if (passagens.has(zona)) {
      return resultadoInvalido('A trajetória contém mais de um resumo para a mesma zona.')
    }

    passagens.set(zona, {
      ...passagem,
      zona,
      status,
    })
  }

  const etapas = ZONAS.map((zona) => {
    const passagem = passagens.get(zona.codigo)
    const status = passagem?.status ?? 'pendente'
    const situacao = SITUACOES[status]

    return {
      movimentacaoId: passagem?.movimentacaoId ?? passagem?.id ?? null,

      zona: zona.codigo,
      nome: zona.nome,
      status,
      situacao: situacao.nome,
      icone: situacao.icone,
      quando: formatarQuando(passagem?.quando),
      contagem: texto(passagem?.count),
      observacao: texto(passagem?.obs),
      concluida: status === 'done' || status === 'ressalva',
      emAndamento: status === 'atual',
      pendente: status === 'pendente',
    }
  })

  const emAndamento = etapas.filter((etapa) => etapa.emAndamento)

  if (emAndamento.length > 1) {
    return resultadoInvalido('A trajetória informa mais de uma zona em andamento.')
  }

  const concluidas = etapas.filter((etapa) => etapa.concluida)

  const atual = emAndamento[0] ?? concluidas[concluidas.length - 1] ?? null

  return {
    etapas,
    zonaAtual: atual
      ? {
          codigo: atual.zona,
          nome: atual.nome,
        }
      : null,
    emAndamento: emAndamento.length === 1,
    possuiMovimentacoes: etapas.some((etapa) => !etapa.pendente),
    erro: '',
  }
}

function resultadoInvalido(mensagem) {
  return {
    etapas: [],
    zonaAtual: null,
    emAndamento: false,
    possuiMovimentacoes: false,
    erro: mensagem,
  }
}
