import { ref } from 'vue'

import {
  auditoriaService,
  requisicaoAuditoriaCancelada,
  validarIdAuditoria,
} from './auditoriaService'

import {
  prepararArquivosOrigem,
} from './auditoriaOrigemService'

export function criarConsultaOrigensAuditoria() {
  const arquivos = ref([])
  const carregando = ref(false)
  const consultado = ref(false)

  let consulta = null
  let destruido = false

  function limpar() {
    consulta?.abort()
    consulta = null

    arquivos.value = []
    carregando.value = false
    consultado.value = false
  }

  async function consultar(resultadoId) {
    if (destruido) return

    limpar()

    const atual = new AbortController()
    consulta = atual
    carregando.value = true

    try {
      const id = validarIdAuditoria(resultadoId)

      const linhagem =
        await auditoriaService.consultarLinhagem(
          id,
          { signal: atual.signal },
        )

      if (
        destruido ||
        atual.signal.aborted ||
        consulta !== atual
      ) {
        return
      }

      arquivos.value =
        prepararArquivosOrigem(linhagem)

      consultado.value = true
    } catch (erro) {
      if (
        destruido ||
        atual.signal.aborted ||
        consulta !== atual ||
        requisicaoAuditoriaCancelada(erro)
      ) {
        return
      }

      throw erro
    } finally {
      if (!destruido && consulta === atual) {
        carregando.value = false
        consulta = null
      }
    }
  }

  function destruir() {
    destruido = true
    limpar()
  }

  return {
    arquivos,
    carregando,
    consultado,
    consultar,
    limpar,
    destruir,
  }
}
