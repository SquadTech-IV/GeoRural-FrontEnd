import { computed, ref } from 'vue'

const dadosExemplo = [
  {
    id: 'car-gua',
    nome: 'CAR_Guarapuava_PR.zip',
    origem: 'upload',
    fonte: 'CAR',
    competencia: '2026',
    hash: 'a3f9…2b1d',
    tamanho: '1,1 MB',
    recebidoEm: '28/09/2026 09:40',
    zona: 'Bruta',
    camadas: [
      {
        id: 'imovel',
        nome: 'Área do imóvel',
        descricao: '1 imóvel · polígono',
        status: 'processado',
        processadoEm: '28/09/2026 09:43',
        destino: 'Base do imóvel',
        mapa: true,
      },
      {
        id: 'rl',
        nome: 'Reserva Legal',
        descricao: 'Polígono',
        status: 'pendente',
        destino: 'IRL',
        mapa: true,
      },
      {
        id: 'app',
        nome: 'APP',
        descricao: 'Polígono',
        status: 'pendente',
        destino: 'Feição tratada',
      },
      {
        id: 'vegetacao',
        nome: 'Vegetação nativa',
        descricao: 'Polígono',
        status: 'pendente',
        destino: 'Feição tratada',
      },
      {
        id: 'uso',
        nome: 'Uso do solo',
        descricao: 'Polígono',
        status: 'pendente',
        destino: 'Feição tratada',
      },
    ],
  },
  {
    id: 'car-pit',
    nome: 'CAR_Pitanga_PR.zip',
    origem: 'upload',
    fonte: 'CAR',
    competencia: '2026',
    hash: 'b84d…0e77',
    tamanho: '0,8 MB',
    recebidoEm: '26/09/2026 11:03',
    zona: 'Bruta',
    camadas: [
      {
        id: 'imovel',
        nome: 'Área do imóvel',
        descricao: '1 imóvel · polígono',
        status: 'pendente',
        destino: 'Base do imóvel',
        mapa: true,
      },
      {
        id: 'rl',
        nome: 'Reserva Legal',
        descricao: 'Polígono',
        status: 'pendente',
        destino: 'IRL',
        mapa: true,
      },
      {
        id: 'app',
        nome: 'APP',
        descricao: 'Polígono',
        status: 'pendente',
        destino: 'Feição tratada',
      },
    ],
  },
  {
    id: 'embargos',
    nome: 'embargos_PR_2026-10-17.gml',
    origem: 'api',
    fonte: 'IBAMA',
    competencia: '2026',
    hash: '7c2e…91af',
    tamanho: '4,2 MB',
    recebidoEm: '17/10/2026 03:00',
    zona: 'Bruta',
    camadas: [
      {
        id: 'embargos',
        nome: 'Embargos ambientais',
        descricao: '842 feições',
        status: 'pendente',
        destino: 'IAE',
        mapa: true,
      },
    ],
  },
  {
    id: 'focos',
    nome: 'focos_2026-10-16.geojson',
    origem: 'api',
    fonte: 'INPE',
    competencia: '2026',
    hash: 'd51b…77ac',
    tamanho: '2,0 MB',
    recebidoEm: '16/10/2026 03:00',
    zona: 'Bruta',
    camadas: [
      {
        id: 'focos',
        nome: 'Focos de calor',
        descricao: '1.197 feições',
        status: 'processado',
        processadoEm: '16/10/2026 03:04',
        destino: 'Feição tratada',
      },
    ],
  },
  {
    id: 'prodes',
    nome: 'prodes_2025.geojson',
    origem: 'api',
    fonte: 'INPE',
    competencia: '2025',
    hash: 'e09c…1f30',
    tamanho: '3,4 MB',
    recebidoEm: '15/10/2026 03:00',
    zona: 'Bruta',
    camadas: [
      {
        id: 'desmatamento',
        nome: 'Desmatamento (PRODES)',
        descricao: '318 feições',
        status: 'pendente',
        destino: 'Feição tratada',
      },
    ],
  },
  {
    id: 'municipios',
    nome: 'malha_municipal_PR.geojson',
    origem: 'api',
    fonte: 'IBGE',
    competencia: '2024',
    hash: 'f10a…55cd',
    tamanho: '6,1 MB',
    recebidoEm: '27/09/2026 16:22',
    zona: 'Bruta',
    camadas: [
      {
        id: 'municipios',
        nome: 'Municípios do Paraná',
        descricao: '399 polígonos',
        status: 'processado',
        processadoEm: '27/09/2026 16:25',
        destino: 'Referência cartográfica',
      },
    ],
  },
]

const apresentacoesStatus = {
  pendente: {
    texto: 'Não processado',
    classe: 'neutro',
  },
  parcial: {
    texto: 'Parcial',
    classe: 'aviso',
  },
  processando: {
    texto: 'Processando',
    classe: 'andamento',
  },
  processado: {
    texto: 'Processado',
    classe: 'sucesso',
  },
}

export function apresentarStatus(status) {
  return apresentacoesStatus[status] ?? {
    texto: 'Não informado',
    classe: 'neutro',
  }
}

export function statusArquivo(arquivo) {
  if (!arquivo?.camadas?.length) return 'pendente'

  if (
    arquivo.camadas.some(
      camada => camada.status === 'processando',
    )
  ) {
    return 'processando'
  }

  const processadas = arquivo.camadas.filter(
    camada => camada.status === 'processado',
  ).length

  if (!processadas) return 'pendente'

  return processadas === arquivo.camadas.length
    ? 'processado'
    : 'parcial'
}

export function podeProcessarArquivo(arquivo) {
  return Boolean(
    arquivo?.camadas.some(
      camada => camada.status === 'pendente',
    ),
  )
}

export function criarConsultaProcessamento() {
  const arquivos = ref(
    dadosExemplo.map(arquivo => ({
      ...arquivo,
      camadas: arquivo.camadas.map(camada => ({
        ...camada,
      })),
    })),
  )

  const busca = ref('')
  const origem = ref('')
  const fonte = ref('')
  const status = ref('')

  const arquivoAtivoId = ref(arquivos.value[0]?.id ?? '')
  const arquivosSelecionados = ref(new Set())
  const camadasSelecionadas = ref(new Set())
  const notificacao = ref(null)

  const temporizadores = new Set()

  let temporizadorNotificacao = null
  let sequenciaNotificacao = 0
  let destruido = false

  const fontes = computed(() =>
    [...new Set(
      arquivos.value.map(arquivo => arquivo.fonte),
    )].sort(),
  )

  const arquivosFiltrados = computed(() => {
    const texto = busca.value.trim().toLocaleLowerCase('pt-BR')

    return arquivos.value.filter(arquivo => {
      const correspondeBusca =
        !texto ||
        arquivo.nome.toLocaleLowerCase('pt-BR').includes(texto)

      return (
        correspondeBusca &&
        (!origem.value || arquivo.origem === origem.value) &&
        (!fonte.value || arquivo.fonte === fonte.value) &&
        (!status.value || statusArquivo(arquivo) === status.value)
      )
    })
  })

  const arquivoAtivo = computed(() =>
    arquivos.value.find(
      arquivo => arquivo.id === arquivoAtivoId.value,
    ) ?? null,
  )

  const visiveisSelecionaveis = computed(() =>
    arquivosFiltrados.value.filter(podeProcessarArquivo),
  )

  const todosVisiveisSelecionados = computed(() =>
    visiveisSelecionaveis.value.length > 0 &&
    visiveisSelecionaveis.value.every(
      arquivo => arquivosSelecionados.value.has(arquivo.id),
    ),
  )

  const algunsVisiveisSelecionados = computed(() =>
    !todosVisiveisSelecionados.value &&
    visiveisSelecionaveis.value.some(
      arquivo => arquivosSelecionados.value.has(arquivo.id),
    ),
  )

  const quantidadeArquivosSelecionados = computed(
    () => arquivosSelecionados.value.size,
  )

  const camadasMarcadas = computed(() =>
    arquivoAtivo.value?.camadas.filter(
      camada =>
        camada.status === 'pendente' &&
        camadasSelecionadas.value.has(camada.id),
    ) ?? [],
  )

  const quantidadeProcessadas = computed(() =>
    arquivoAtivo.value?.camadas.filter(
      camada => camada.status === 'processado',
    ).length ?? 0,
  )

  function fecharNotificacao() {
    clearTimeout(temporizadorNotificacao)
    notificacao.value = null
  }

  function notificar(tipo, mensagem) {
    if (destruido) return

    clearTimeout(temporizadorNotificacao)

    notificacao.value = {
      id: ++sequenciaNotificacao,
      tipo,
      mensagem,
    }

    if (tipo !== 'erro') {
      temporizadorNotificacao = setTimeout(
        fecharNotificacao,
        6000,
      )
    }
  }

  function abrirArquivo(id) {
    arquivoAtivoId.value = id
    camadasSelecionadas.value = new Set()
  }

  function selecionarArquivo(id, selecionado) {
    const arquivo = arquivos.value.find(item => item.id === id)

    if (!podeProcessarArquivo(arquivo)) return

    const selecao = new Set(arquivosSelecionados.value)

    if (selecionado) {
      selecao.add(id)
    } else {
      selecao.delete(id)
    }

    arquivosSelecionados.value = selecao
  }

  function selecionarVisiveis(selecionado) {
    const selecao = new Set(arquivosSelecionados.value)

    for (const arquivo of visiveisSelecionaveis.value) {
      if (selecionado) {
        selecao.add(arquivo.id)
      } else {
        selecao.delete(arquivo.id)
      }
    }

    arquivosSelecionados.value = selecao
  }

  function selecionarCamada(id, selecionada) {
    const camada = arquivoAtivo.value?.camadas.find(
      item => item.id === id,
    )

    if (camada?.status !== 'pendente') return

    const selecao = new Set(camadasSelecionadas.value)

    if (selecionada) {
      selecao.add(id)
    } else {
      selecao.delete(id)
    }

    camadasSelecionadas.value = selecao
  }

  function limparSelecoesIndisponiveis() {
    arquivosSelecionados.value = new Set(
      [...arquivosSelecionados.value].filter(id =>
        podeProcessarArquivo(
          arquivos.value.find(arquivo => arquivo.id === id),
        ),
      ),
    )

    camadasSelecionadas.value = new Set(
      [...camadasSelecionadas.value].filter(id =>
        arquivoAtivo.value?.camadas.some(
          camada =>
            camada.id === id &&
            camada.status === 'pendente',
        ),
      ),
    )
  }

  function iniciarSimulacao(trabalhos) {
    const pendentes = trabalhos.filter(
      trabalho => trabalho.camada.status === 'pendente',
    )

    if (!pendentes.length) {
      notificar(
        'aviso',
        'Selecione pelo menos uma camada não processada.',
      )

      return
    }

    for (const trabalho of pendentes) {
      trabalho.camada.status = 'processando'
    }

    limparSelecoesIndisponiveis()

    notificar(
      'informacao',
      `Simulação iniciada para ${pendentes.length} camada(s).`,
    )

    let concluidas = 0

    pendentes.forEach((trabalho, indice) => {
      const temporizador = setTimeout(() => {
        temporizadores.delete(temporizador)

        if (destruido) return

        trabalho.camada.status = 'processado'
        trabalho.camada.processadoEm =
          new Date().toLocaleString('pt-BR')

        concluidas++

        if (concluidas === pendentes.length) {
          notificar(
            'sucesso',
            `Simulação concluída para ${pendentes.length} camada(s). Nenhum pipeline real foi executado.`,
          )
        }
      }, 1200 + indice * 450)

      temporizadores.add(temporizador)
    })
  }

  function processarCamada(arquivoId, camadaId) {
    const arquivo = arquivos.value.find(
      item => item.id === arquivoId,
    )

    const camada = arquivo?.camadas.find(
      item => item.id === camadaId,
    )

    if (!camada) {
      notificar('erro', 'A camada selecionada não foi encontrada.')
      return
    }

    iniciarSimulacao([{ arquivo, camada }])
  }

  function processarCamadasMarcadas() {
    const arquivo = arquivoAtivo.value

    if (!arquivo) return

    iniciarSimulacao(
      camadasMarcadas.value.map(camada => ({
        arquivo,
        camada,
      })),
    )
  }

  function processarArquivosSelecionados() {
    const trabalhos = []

    for (const arquivo of arquivos.value) {
      if (!arquivosSelecionados.value.has(arquivo.id)) continue

      for (const camada of arquivo.camadas) {
        if (camada.status === 'pendente') {
          trabalhos.push({ arquivo, camada })
        }
      }
    }

    iniciarSimulacao(trabalhos)
  }

  function solicitarMapa() {
    notificar(
      'informacao',
      'A abertura desta camada no mapa depende da integração com os resultados do backend.',
    )
  }

  function destruir() {
    destruido = true

    clearTimeout(temporizadorNotificacao)

    for (const temporizador of temporizadores) {
      clearTimeout(temporizador)
    }

    temporizadores.clear()
  }

  return {
    busca,
    origem,
    fonte,
    status,
    fontes,
    arquivosFiltrados,
    arquivoAtivo,
    arquivoAtivoId,
    arquivosSelecionados,
    camadasSelecionadas,
    todosVisiveisSelecionados,
    algunsVisiveisSelecionados,
    visiveisSelecionaveis,
    quantidadeArquivosSelecionados,
    quantidadeProcessadas,
    camadasMarcadas,
    notificacao,
    abrirArquivo,
    selecionarArquivo,
    selecionarVisiveis,
    selecionarCamada,
    processarCamada,
    processarCamadasMarcadas,
    processarArquivosSelecionados,
    solicitarMapa,
    fecharNotificacao,
    destruir,
  }
}
