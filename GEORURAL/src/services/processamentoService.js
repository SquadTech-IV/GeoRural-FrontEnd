import { computed, ref } from 'vue'
import api from './api'

function validarId(valor) {
  const id = String(valor ?? '').trim()

  if (!/^[1-9]\d*$/.test(id)) {
    throw new Error('Selecione um arquivo válido.')
  }

  return id
}

function foiCancelado(erro) {
  return (
    erro?.code === 'ERR_CANCELED' ||
    erro?.name === 'CanceledError' ||
    erro?.name === 'AbortError'
  )
}

function mensagemErro(erro, envio = false) {
  const status = erro?.response?.status
  const dados = erro?.response?.data

  if (
    erro?.code === 'ECONNABORTED' ||
    erro?.code === 'ETIMEDOUT'
  ) {
    return envio
      ? 'O tempo de resposta terminou. O envio pode ter sido recebido pelo servidor; confirme antes de reenviar.'
      : 'A consulta demorou mais que o permitido. Tente novamente.'
  }

  if (erro?.isAxiosError && !erro.response) {
    return envio
      ? 'A conexão foi interrompida. Confirme no servidor se o envio foi recebido antes de tentar novamente.'
      : 'Não foi possível acessar o backend. Verifique se ele está em execução.'
  }

  if (status === 401 || status === 403) {
    return 'Você não possui autorização para executar esta operação.'
  }

  const mensagem =
    typeof dados?.mensagem === 'string'
      ? dados.mensagem.trim()
      : typeof dados?.message === 'string'
        ? dados.message.trim()
        : ''

  if (
    status >= 400 &&
    status < 500 &&
    mensagem
  ) {
    return mensagem
  }

  if (status === 404) {
    return 'O arquivo solicitado não foi encontrado.'
  }

  if (status === 409) {
    return 'O arquivo não está disponível para processamento.'
  }

  if (status >= 500) {
    return 'O servidor não conseguiu concluir a operação.'
  }

  if (!erro?.isAxiosError && erro?.message) {
    return erro.message
  }

  return 'Não foi possível concluir a operação.'
}

async function requisitar(operacao, envio = false) {
  try {
    return await operacao()
  } catch (erro) {
    if (foiCancelado(erro)) {
      throw erro
    }

    throw new Error(mensagemErro(erro, envio), {
      cause: erro,
    })
  }
}

export function formatarData(valor) {
  if (!valor) return 'Não informado'

  const data = new Date(valor)

  if (Number.isNaN(data.getTime())) {
    return String(valor)
  }

  return data.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export function formatarTamanho(valor) {
  if (valor == null || valor === '') {
    return 'Não informado'
  }

  const bytes = Number(valor)

  if (!Number.isFinite(bytes) || bytes < 0) {
    return 'Não informado'
  }

  const unidades = ['B', 'KB', 'MB', 'GB', 'TB']

  let tamanho = bytes
  let indice = 0

  while (tamanho >= 1024 && indice < unidades.length - 1) {
    tamanho /= 1024
    indice++
  }

  return `${tamanho.toLocaleString('pt-BR', {
    maximumFractionDigits: indice === 0 ? 0 : 1,
  })} ${unidades[indice]}`
}

export function apresentarStatus(valor) {
  const original = String(valor ?? '').trim()
  const codigo = original.toUpperCase()

  const estados = {
    AGUARDANDO: {
      texto: 'Aguardando',
      classe: 'aviso',
    },
    PENDENTE: {
      texto: 'Pendente',
      classe: 'aviso',
    },
    EM_PROCESSAMENTO: {
      texto: 'Em processamento',
      classe: 'andamento',
    },
    PROCESSANDO: {
      texto: 'Processando',
      classe: 'andamento',
    },
    PROCESSADO: {
      texto: 'Processado',
      classe: 'sucesso',
    },
    CONCLUIDO: {
      texto: 'Concluído',
      classe: 'sucesso',
    },
    SUCESSO: {
      texto: 'Sucesso',
      classe: 'sucesso',
    },
    ERRO: {
      texto: 'Erro',
      classe: 'erro',
    },
    FALHA: {
      texto: 'Falha',
      classe: 'erro',
    },
    FALHOU: {
      texto: 'Falhou',
      classe: 'erro',
    },
  }

  return estados[codigo] ?? {
    texto: original || 'Não informado',
    classe: 'neutro',
  }
}

function adaptarArquivo(dado) {
  if (!dado || typeof dado !== 'object') {
    throw new Error('O backend retornou um arquivo inválido.')
  }

  return {
    id: validarId(dado.id),
    nome: dado.nomeArquivo || dado.nome || 'Arquivo sem nome',
    titulo: dado.nome || '',
    fonte: dado.fonte || 'Não informada',
    formato: dado.formato || 'Não informado',
    quantidade: dado.qtdArquivos ?? null,
    situacao: String(dado.situacao ?? ''),
    recebidoEm: formatarData(dado.recebidoEm),
  }
}

function adaptarDetalhe(dado) {
  const resumo = adaptarArquivo(dado)

  if (
    dado.arquivos != null &&
    !Array.isArray(dado.arquivos)
  ) {
    throw new Error(
      'O backend retornou uma lista de conteúdos inválida.',
    )
  }

  return {
    ...resumo,
    srid: dado.srid,
    tamanho: formatarTamanho(dado.tamanhoBytes),
    caminho: dado.caminho || '',
    descricao: dado.descricao || '',
    itens: (dado.arquivos ?? []).map(item => ({
      id: validarId(item.id),
      nome: item.nome || 'Item sem nome',
      formato: item.formato || 'Não informado',
      tamanho: formatarTamanho(item.tamanhoBytes),
      descricao: item.descricao || '',
    })),
  }
}

export const processamentoService = {
  listar({ signal } = {}) {
    return requisitar(async () => {
      const { data } = await api.get('/api/arquivos', {
        signal,
        timeout: 30000,
      })

      if (!Array.isArray(data)) {
        throw new Error(
          'O backend retornou uma lista de arquivos inválida.',
        )
      }

      return data.map(adaptarArquivo)
    })
  },

  detalhe(id, { signal } = {}) {
    return requisitar(async () => {
      const arquivoId = validarId(id)

      const { data } = await api.get(
        `/api/arquivos/${arquivoId}`,
        {
          signal,
          timeout: 30000,
        },
      )

      return adaptarDetalhe(data)
    })
  },

  encaminhar(id) {
    return requisitar(async () => {
      const arquivoId = validarId(id)

      const { data } = await api.post(
        `/api/arquivos/${arquivoId}/processar`,
        null,
        {
          timeout: 60000,
        },
      )

      if (
        !data ||
        String(data.id) !== arquivoId
      ) {
        throw new Error(
          'O servidor respondeu ao envio, mas a confirmação recebida é inválida. Confirme o recebimento antes de reenviar.',
        )
      }

      return data
    }, true)
  },

  baixar(id) {
    return requisitar(async () => {
      const arquivoId = validarId(id)

      const { data } = await api.get(
        `/api/arquivos/${arquivoId}/download`,
        {
          responseType: 'blob',
          timeout: 60000,
        },
      )

      return data
    })
  },
}

export function criarConsultaProcessamento() {
  const arquivos = ref([])
  const busca = ref('')
  const fonte = ref('')
  const status = ref('')

  const arquivoAtivoId = ref('')
  const arquivoAtivo = ref(null)
  const arquivosSelecionados = ref(new Set())

  const carregando = ref(false)
  const carregandoDetalhe = ref(false)

  const falhouLista = ref(false)
  const falhouDetalhe = ref(false)

  const enviando = ref(false)
  const baixando = ref(false)

  const ultimaEntrega = ref(null)
  const notificacao = ref(null)

  let consultaLista = null
  let consultaDetalhe = null
  let temporizadorNotificacao = null

  let sequencia = 0
  let destruido = false

  const fontes = computed(() =>
    [...new Set(
      arquivos.value.map(arquivo => arquivo.fonte),
    )].sort(),
  )

  const situacoes = computed(() =>
    [...new Set(
      arquivos.value
        .map(arquivo => arquivo.situacao)
        .filter(Boolean),
    )].sort(),
  )

  const arquivosFiltrados = computed(() => {
    const texto = busca.value
      .trim()
      .toLocaleLowerCase('pt-BR')

    return arquivos.value.filter(arquivo => {
      const correspondeNome =
        !texto ||
        arquivo.nome
          .toLocaleLowerCase('pt-BR')
          .includes(texto) ||
        arquivo.titulo
          .toLocaleLowerCase('pt-BR')
          .includes(texto)

      return (
        correspondeNome &&
        (!fonte.value || arquivo.fonte === fonte.value) &&
        (!status.value || arquivo.situacao === status.value)
      )
    })
  })

  const todosVisiveisSelecionados = computed(() =>
    arquivosFiltrados.value.length > 0 &&
    arquivosFiltrados.value.every(
      arquivo => arquivosSelecionados.value.has(arquivo.id),
    ),
  )

  const algunsVisiveisSelecionados = computed(() =>
    !todosVisiveisSelecionados.value &&
    arquivosFiltrados.value.some(
      arquivo => arquivosSelecionados.value.has(arquivo.id),
    ),
  )

  const quantidadeArquivosSelecionados = computed(
    () => arquivosSelecionados.value.size,
  )

  function fecharNotificacao() {
    clearTimeout(temporizadorNotificacao)
    notificacao.value = null
  }

  function notificar(tipo, mensagem) {
    if (destruido) return

    clearTimeout(temporizadorNotificacao)

    notificacao.value = {
      id: ++sequencia,
      tipo,
      mensagem,
    }

    if (tipo !== 'erro') {
      temporizadorNotificacao = setTimeout(
        fecharNotificacao,
        7000,
      )
    }
  }

  async function abrirArquivo(id) {
    if (destruido) return

    consultaDetalhe?.abort()

    const atual = new AbortController()
    consultaDetalhe = atual

    arquivoAtivoId.value = String(id)
    arquivoAtivo.value = null

    carregandoDetalhe.value = true
    falhouDetalhe.value = false

    try {
      const detalhe = await processamentoService.detalhe(
        id,
        {
          signal: atual.signal,
        },
      )

      if (
        destruido ||
        atual.signal.aborted ||
        consultaDetalhe !== atual
      ) {
        return
      }

      arquivoAtivo.value = detalhe
    } catch (erro) {
      if (
        destruido ||
        atual.signal.aborted ||
        consultaDetalhe !== atual ||
        foiCancelado(erro)
      ) {
        return
      }

      falhouDetalhe.value = true
      notificar('erro', erro.message)
    } finally {
      if (!destruido && consultaDetalhe === atual) {
        carregandoDetalhe.value = false
        consultaDetalhe = null
      }
    }
  }

  async function carregarArquivos() {
    if (destruido || enviando.value) return

    consultaLista?.abort()

    const atual = new AbortController()
    consultaLista = atual

    carregando.value = true
    falhouLista.value = false

    try {
      const resposta = await processamentoService.listar({
        signal: atual.signal,
      })

      if (
        destruido ||
        atual.signal.aborted ||
        consultaLista !== atual
      ) {
        return
      }

      arquivos.value = resposta

      const ids = new Set(
        resposta.map(arquivo => arquivo.id),
      )

      arquivosSelecionados.value = new Set(
        [...arquivosSelecionados.value].filter(
          id => ids.has(id),
        ),
      )

      if (!fontes.value.includes(fonte.value)) {
        fonte.value = ''
      }

      if (!situacoes.value.includes(status.value)) {
        status.value = ''
      }

      const proximoId = ids.has(arquivoAtivoId.value)
        ? arquivoAtivoId.value
        : resposta[0]?.id

      if (proximoId) {
        await abrirArquivo(proximoId)
      } else {
        consultaDetalhe?.abort()
        consultaDetalhe = null

        arquivoAtivoId.value = ''
        arquivoAtivo.value = null

        carregandoDetalhe.value = false
        falhouDetalhe.value = false
      }
    } catch (erro) {
      if (
        destruido ||
        atual.signal.aborted ||
        consultaLista !== atual ||
        foiCancelado(erro)
      ) {
        return
      }

      falhouLista.value = true
      notificar('erro', erro.message)
    } finally {
      if (!destruido && consultaLista === atual) {
        carregando.value = false
        consultaLista = null
      }
    }
  }

  function selecionarArquivo(id, selecionado) {
    if (enviando.value || carregando.value) return

    const selecao = new Set(arquivosSelecionados.value)

    if (selecionado) {
      selecao.add(String(id))
    } else {
      selecao.delete(String(id))
    }

    arquivosSelecionados.value = selecao
  }

  function selecionarVisiveis(selecionado) {
    if (enviando.value || carregando.value) return

    const selecao = new Set(arquivosSelecionados.value)

    for (const arquivo of arquivosFiltrados.value) {
      if (selecionado) {
        selecao.add(arquivo.id)
      } else {
        selecao.delete(arquivo.id)
      }
    }

    arquivosSelecionados.value = selecao
  }

  async function enviarArquivos(ids) {
    if (destruido || enviando.value) return

    const selecionados = [...new Set(ids.map(String))]

    if (!selecionados.length) {
      notificar('aviso', 'Selecione pelo menos um arquivo.')
      return
    }

    enviando.value = true

    const sucessos = []
    const falhas = []

    try {
      for (const id of selecionados) {
        if (destruido) break

        try {
          const entrega =
            await processamentoService.encaminhar(id)

          if (destruido) return

          ultimaEntrega.value = entrega
          sucessos.push(id)
        } catch (erro) {
          if (destruido) return

          const arquivo = arquivos.value.find(
            item => item.id === id,
          )

          falhas.push(
            `${arquivo?.nome ?? id}: ${erro.message}`,
          )
        }
      }

      if (destruido) return

      arquivosSelecionados.value = new Set(
        [...arquivosSelecionados.value].filter(
          id => !sucessos.includes(id),
        ),
      )

      if (falhas.length) {
        notificar(
          'erro',
          `${sucessos.length} envio(s) confirmado(s) e ` +
          `${falhas.length} sem confirmação. ` +
          falhas.join(' '),
        )
      } else {
        notificar(
          'sucesso',
          `${sucessos.length} arquivo(s) encaminhado(s). ` +
          'A confirmação não indica conclusão do processamento.',
        )
      }
    } finally {
      if (!destruido) {
        enviando.value = false
      }
    }
  }

  function processarArquivosSelecionados() {
    return enviarArquivos(
      [...arquivosSelecionados.value],
    )
  }

  function processarArquivoAtivo() {
    if (!arquivoAtivo.value) return

    return enviarArquivos([arquivoAtivo.value.id])
  }

  async function baixarOriginal() {
    const arquivo = arquivoAtivo.value

    if (!arquivo || baixando.value || destruido) return

    baixando.value = true

    try {
      const conteudo = await processamentoService.baixar(
        arquivo.id,
      )

      if (destruido) return

      const url = URL.createObjectURL(conteudo)
      const link = document.createElement('a')

      try {
        link.href = url
        link.download = arquivo.nome
        document.body.appendChild(link)
        link.click()
      } finally {
        link.remove()

        setTimeout(() => {
          URL.revokeObjectURL(url)
        }, 1000)
      }
    } catch (erro) {
      if (!destruido) {
        notificar('erro', erro.message)
      }
    } finally {
      if (!destruido) {
        baixando.value = false
      }
    }
  }

  function destruir() {
    destruido = true

    consultaLista?.abort()
    consultaDetalhe?.abort()

    clearTimeout(temporizadorNotificacao)
  }

  return {
    busca,
    fonte,
    status,
    fontes,
    situacoes,
    arquivosFiltrados,
    arquivoAtivo,
    arquivoAtivoId,
    arquivosSelecionados,
    todosVisiveisSelecionados,
    algunsVisiveisSelecionados,
    quantidadeArquivosSelecionados,
    carregando,
    carregandoDetalhe,
    falhouLista,
    falhouDetalhe,
    enviando,
    baixando,
    ultimaEntrega,
    notificacao,
    carregarArquivos,
    abrirArquivo,
    selecionarArquivo,
    selecionarVisiveis,
    processarArquivosSelecionados,
    processarArquivoAtivo,
    baixarOriginal,
    fecharNotificacao,
    destruir,
  }
}
