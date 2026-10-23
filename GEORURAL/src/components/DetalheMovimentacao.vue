<script setup>
import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
} from 'vue'

defineProps({
  carregando: {
    type: Boolean,
    default: false,
  },
  falhou: {
    type: Boolean,
    default: false,
  },
  campos: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['fechar', 'tentar-novamente'])

const modal = ref(null)
const fecharButton = ref(null)

let elementoAnterior
let overflowAnterior

function fechar() {
  emit('fechar')
}

function tratarTeclado(evento) {
  if (evento.key === 'Escape') {
    evento.preventDefault()
    fechar()
    return
  }

  if (evento.key !== 'Tab') return

  const elementos = Array.from(
    modal.value?.querySelectorAll(
      'button, a[href], input, select, textarea, [tabindex="0"]',
    ) ?? [],
  ).filter(
    (elemento) =>
      !elemento.matches(':disabled') &&
      elemento.getClientRects().length,
  )

  const primeiro = elementos[0]
  const ultimo = elementos[elementos.length - 1]

  if (!primeiro) {
    evento.preventDefault()
    modal.value?.focus()
    return
  }

  if (
    evento.shiftKey &&
    (
      document.activeElement === primeiro ||
      document.activeElement === modal.value
    )
  ) {
    evento.preventDefault()
    ultimo.focus()
  } else if (
    !evento.shiftKey &&
    document.activeElement === ultimo
  ) {
    evento.preventDefault()
    primeiro.focus()
  }
}

onMounted(async () => {
  elementoAnterior = document.activeElement
  overflowAnterior = document.body.style.overflow

  document.body.style.overflow = 'hidden'

  await nextTick()
  fecharButton.value?.focus()
})

onBeforeUnmount(() => {
  document.body.style.overflow = overflowAnterior

  if (elementoAnterior?.isConnected) {
    elementoAnterior.focus()
  }
})
</script>

<template>
  <Teleport to="body">
    <div
      class="movimentacao-overlay"
      @click.self="fechar"
    >
      <section
        ref="modal"
        class="movimentacao-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-detalhe-movimentacao"
        :aria-busy="carregando"
        tabindex="-1"
        @keydown="tratarTeclado"
      >
        <header class="movimentacao-cabecalho">
          <h2 id="titulo-detalhe-movimentacao">
            Detalhes da movimentação
          </h2>

          <button
            ref="fecharButton"
            type="button"
            class="movimentacao-fechar"
            aria-label="Fechar detalhes"
            @click="fechar"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div class="movimentacao-conteudo">
          <p
            v-if="carregando"
            class="movimentacao-estado"
            role="status"
          >
            Consultando detalhes da movimentação...
          </p>

          <div
            v-else-if="falhou"
            class="movimentacao-estado"
          >
            <button
              type="button"
              class="movimentacao-botao"
              @click="emit('tentar-novamente')"
            >
              Tentar novamente
            </button>
          </div>

          <dl v-else class="movimentacao-campos">
            <div
              v-for="campo in campos"
              :key="campo.titulo"
              class="movimentacao-campo"
            >
              <dt>{{ campo.titulo }}</dt>
              <dd>{{ campo.valor }}</dd>
            </div>
          </dl>
        </div>

        <footer class="movimentacao-rodape">
          <button
            type="button"
            class="movimentacao-botao"
            @click="fechar"
          >
            Fechar
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped src="../assets/css/detalhe-movimentacao.css"></style>
