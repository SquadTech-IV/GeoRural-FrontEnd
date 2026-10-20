import { ref } from 'vue'

import {
  arquivosRecebidosService,
  consultaArquivoCancelada,
} from './arquivosRecebidosService'

export function criarDetalheArquivoRecebido() {
  const arquivo = ref(null)
  const carregando = ref(false)
  const baixando = ref(false)
  const falhou = ref(false)
  const mensagem = ref('')

  let consulta = null
  let download = null
  let destruido = false

  function fecharMensagem() {
    mensagem.value = ''
  }

  async function consultar(id) {
    if (destruido) return

    consulta?.abort()
    download?.abort()
    download = null

    const atual = new AbortController()
    consulta = atual

    arquivo.value = null
    carregando.value = true
    baixando.value = false
    falhou.value = false
    mensagem.value = ''

    try {
      const resposta =
        await arquivosRecebidosService.consultarDetalhe(
          id,
          {
            signal: atual.signal,
          },
        )

      if (
        destruido ||
        atual.signal.aborted ||
        consulta !== atual
      ) {
        return
      }

      arquivo.value = resposta
    } catch (erro) {
      if (
        destruido ||
        atual.signal.aborted ||
        consulta !== atual ||
        consultaArquivoCancelada(erro)
      ) {
        return
      }

      falhou.value = true
      mensagem.value = erro.message
    } finally {
      if (!destruido && consulta === atual) {
        carregando.value = false
        consulta = null
      }
    }
  }

  async function baixarOriginal() {
    const selecionado = arquivo.value

    if (
      destruido ||
      baixando.value ||
      !selecionado
    ) {
      return
    }

    const atual = new AbortController()
    download = atual

    baixando.value = true
    mensagem.value = ''

    try {
      const conteudo =
        await arquivosRecebidosService.baixarOriginal(
          selecionado.id,
          {
            signal: atual.signal,
          },
        )

      if (
        destruido ||
        atual.signal.aborted ||
        download !== atual
      ) {
        return
      }

      const url = URL.createObjectURL(conteudo)
      const link = document.createElement('a')

      try {
        link.href = url
        link.download =
          selecionado.nomeArquivo || 'arquivo-original'

        document.body.appendChild(link)
        link.click()
      } finally {
        link.remove()

        setTimeout(() => {
          URL.revokeObjectURL(url)
        }, 1000)
      }
    } catch (erro) {
      if (
        destruido ||
        atual.signal.aborted ||
        download !== atual ||
        consultaArquivoCancelada(erro)
      ) {
        return
      }

      mensagem.value = erro.message
    } finally {
      if (!destruido && download === atual) {
        baixando.value = false
        download = null
      }
    }
  }

  function destruir() {
    destruido = true
    consulta?.abort()
    download?.abort()
  }

  return {
    arquivo,
    carregando,
    baixando,
    falhou,
    mensagem,
    consultar,
    baixarOriginal,
    fecharMensagem,
    destruir,
  }
}
