import { ref } from 'vue'

import {
  arquivosRecebidosService,
  consultaArquivoCancelada,
} from './arquivosRecebidosService'

export function criarConsultaArquivosRecebidos() {
  const arquivos = ref([])

  const nome = ref('')
  const situacao = ref('')

  const carregando = ref(false)
  const falhou = ref(false)
  const consultado = ref(false)

  const mensagem = ref('')

  let consulta = null
  let destruido = false

  async function consultar() {
    if (destruido) return

    consulta?.abort()

    const atual = new AbortController()
    consulta = atual

    carregando.value = true
    falhou.value = false
    mensagem.value = ''

    try {
      const resposta =
        await arquivosRecebidosService.listar({
          nome: nome.value,
          situacao: situacao.value,
          signal: atual.signal,
        })

      if (
        destruido ||
        atual.signal.aborted ||
        consulta !== atual
      ) {
        return
      }

      arquivos.value = resposta
      consultado.value = true
    } catch (erro) {
      if (
        destruido ||
        atual.signal.aborted ||
        consulta !== atual ||
        consultaArquivoCancelada(erro)
      ) {
        return
      }

      arquivos.value = []
      falhou.value = true

      mensagem.value =
        'Não foi possível consultar os arquivos recebidos. Tente novamente.'
    } finally {
      if (!destruido && consulta === atual) {
        carregando.value = false
        consulta = null
      }
    }
  }

  function limparFiltros() {
    nome.value = ''
    situacao.value = ''

    return consultar()
  }

  function fecharMensagem() {
    mensagem.value = ''
  }

  function destruir() {
    destruido = true
    consulta?.abort()
  }

  return {
    arquivos,
    nome,
    situacao,
    carregando,
    falhou,
    consultado,
    mensagem,
    consultar,
    limparFiltros,
    fecharMensagem,
    destruir,
  }
}
