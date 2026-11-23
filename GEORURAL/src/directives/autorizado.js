import { watchEffect } from 'vue'
import { autenticacaoService } from '../services/autenticacaoService'
import { possuiPermissao } from '../services/permissaoService'

// Aplica-se apenas a elementos nativos. O backend continua validando cada operação.
export function criarDiretivaAutorizado(autenticacao = autenticacaoService) {
  const observadores = new WeakMap()
  function observar(elemento, binding) {
    observadores.get(elemento)?.()
    const display = elemento.dataset.displayOriginal ?? elemento.style.display
    elemento.dataset.displayOriginal = display
    observadores.set(
      elemento,
      watchEffect(() => {
        const autorizado =
          autenticacao.estado.autenticado &&
          possuiPermissao(autenticacao.estado.perfil, binding.value)
        elemento.hidden = !autorizado
        elemento.style.display = autorizado ? display : 'none'
        elemento.inert = !autorizado
      }),
    )
  }
  return {
    mounted: observar,
    updated: observar,
    unmounted(elemento) {
      observadores.get(elemento)?.()
      observadores.delete(elemento)
    },
  }
}
export default criarDiretivaAutorizado()
