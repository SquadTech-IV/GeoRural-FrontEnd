<script setup>
import {nextTick,onBeforeUnmount,onMounted,ref,} from 'vue'

const props = defineProps({
  titulo: {
    type: String,
    default: 'Confirmar desativação',
  },
  mensagem: {
    type: String,
    required: true,
  },
  aviso: {
    type: String,
    default: '',
  },
  processando: {
    type: Boolean,
    default: false,
  },
  erro: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['cancelar', 'confirmar'])

const cancelarButton = ref(null)

let elementoAnterior
let overflowAnterior

function cancelar() {
  if (props.processando) return

  emit('cancelar')
}

function confirmar() {
  if (props.processando) return

  emit('confirmar')
}

function tratarTeclado(evento) {
  if (evento.key === 'Escape') {
    evento.preventDefault()
    cancelar()
    return
  }

  if (evento.key !== 'Tab') return

  const elementos = Array.from(
    evento.currentTarget.querySelectorAll('button'),
  ).filter(
    (elemento) =>
      !elemento.matches(':disabled') &&
      elemento.getClientRects().length,
  )

  const primeiro = elementos[0]
  const ultimo = elementos[elementos.length - 1]

  if (!primeiro) {
    evento.preventDefault()
    evento.currentTarget.focus()
    return
  }

  if (
    evento.shiftKey &&
    (
      document.activeElement === primeiro ||
      document.activeElement === evento.currentTarget
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
  cancelarButton.value?.focus()
})

onBeforeUnmount(() => {
  document.body.style.overflow = overflowAnterior
  elementoAnterior?.focus()
})
</script>

<template>
  <Teleport to="body">
    <div class="cadastros-overlay" @click.self="cancelar">
      <section
        class="cadastros-modal confirmacao-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-confirmacao"
        aria-describedby="mensagem-confirmacao"
        :aria-busy="processando"
        tabindex="-1"
        @keydown="tratarTeclado"
      >
        <header class="cadastros-modal-cabecalho">
          <div>
            <span class="cadastros-identificacao">
              CONFIRMAÇÃO
            </span>

            <h2 id="titulo-confirmacao">
              {{ titulo }}
            </h2>
          </div>

          <button
            type="button"
            class="cadastros-fechar"
            aria-label="Fechar confirmação"
            :disabled="processando"
            @click="cancelar"
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

        <div class="cadastros-modal-conteudo">
          <p
            id="mensagem-confirmacao"
            class="confirmacao-mensagem"
          >
            {{ mensagem }}
          </p>

          <p v-if="aviso" class="confirmacao-aviso">
            {{ aviso }}
          </p>

          <p v-if="erro" class="cadastros-erro" role="alert">
            {{ erro }}
          </p>

          <p
            v-if="processando"
            class="cadastros-ajuda"
            role="status"
          >
            Aguarde enquanto a desativação é realizada.
          </p>
        </div>

        <footer class="cadastros-modal-rodape">
          <button
            ref="cancelarButton"
            type="button"
            class="cadastros-botao"
            :disabled="processando"
            @click="cancelar"
          >
            Cancelar
          </button>

          <button
            type="button"
            class="cadastros-botao confirmacao-botao"
            :disabled="processando"
            @click="confirmar"
          >
            {{
              processando
                ? 'Desativando...'
                : 'Confirmar desativação'
            }}
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
<style scoped src="../assets/css/cadastros.css"></style>
<style scoped src="../assets/css/confirmacao.css"></style>
