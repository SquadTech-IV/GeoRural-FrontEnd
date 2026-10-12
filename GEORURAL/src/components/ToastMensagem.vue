<script setup>
import { computed, onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  mensagem: {
    type: String,
    default: '',
  },
  tipo: {
    type: String,
    default: 'sucesso',
    validator: (valor) =>
      ['sucesso', 'erro', 'aviso'].includes(valor),
  },
  duracao: {
    type: Number,
    default: 5000,
  },
})

const emit = defineEmits(['fechar'])

const titulos = {
  sucesso: 'Sucesso',
  erro: 'Não foi possível concluir',
  aviso: 'Atenção',
}

const titulo = computed(() => titulos[props.tipo])

let temporizador

function cancelarTemporizador() {
  clearTimeout(temporizador)
}

function iniciarTemporizador() {
  cancelarTemporizador()

  if (!props.mensagem || props.duracao <= 0) return

  temporizador = setTimeout(() => {
    emit('fechar')
  }, props.duracao)
}

watch(
  [
    () => props.mensagem,
    () => props.tipo,
    () => props.duracao,
  ],
  iniciarTemporizador,
  { immediate: true },
)

onBeforeUnmount(cancelarTemporizador)
</script>

<template>
  <Teleport to="body">
    <div
      v-if="mensagem"
      class="toast-mensagem"
      :class="`toast-mensagem--${tipo}`"
      @mouseenter="cancelarTemporizador"
      @mouseleave="iniciarTemporizador"
      @focusin="cancelarTemporizador"
      @focusout="iniciarTemporizador"
    >
      <span class="toast-mensagem-icone" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <template v-if="tipo === 'sucesso'">
            <circle cx="12" cy="12" r="9" />
            <path d="m8 12 3 3 5-6" />
          </template>

          <template v-else-if="tipo === 'erro'">
            <circle cx="12" cy="12" r="9" />
            <path d="m9 9 6 6m0-6-6 6" />
          </template>

          <template v-else>
            <path
              d="m12 3 10 18H2L12 3Z"
            />
            <path d="M12 9v5m0 3h.01" />
          </template>
        </svg>
      </span>

      <div
        class="toast-mensagem-conteudo"
        :role="tipo === 'erro' ? 'alert' : 'status'"
        aria-atomic="true"
      >
        <strong>{{ titulo }}</strong>
        <p>{{ mensagem }}</p>
      </div>

      <button
        type="button"
        class="toast-mensagem-fechar"
        aria-label="Fechar notificação"
        @click="emit('fechar')"
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
    </div>
  </Teleport>
</template>

<style scoped src="../assets/css/toast.css"></style>
