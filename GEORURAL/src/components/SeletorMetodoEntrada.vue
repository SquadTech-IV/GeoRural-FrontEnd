<script setup>
defineProps({
  modelValue: {
    type: String,
    default: 'upload',
    validator: valor => ['upload', 'api'].includes(valor),
  },
  desabilitado: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div
    class="metodo-entrada"
    role="group"
    aria-label="Forma de entrada dos dados"
  >
    <button
      type="button"
      class="metodo-entrada-opcao"
      :class="{
        'metodo-entrada-opcao--ativo': modelValue === 'upload',
      }"
      :aria-pressed="modelValue === 'upload'"
      :disabled="desabilitado"
      @click="emit('update:modelValue', 'upload')"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M12 16V4" />
        <path d="m7 9 5-5 5 5" />
        <path d="M4 16v4h16v-4" />
      </svg>

      <span>
        <strong>Upload</strong>
        <small>Envio manual de arquivos</small>
      </span>
    </button>

    <button
      type="button"
      class="metodo-entrada-opcao"
      :class="{
        'metodo-entrada-opcao--ativo': modelValue === 'api',
      }"
      :aria-pressed="modelValue === 'api'"
      :disabled="desabilitado"
      @click="emit('update:modelValue', 'api')"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="m8 8-4 4 4 4" />
        <path d="m16 8 4 4-4 4" />
        <path d="m14 4-4 16" />
      </svg>

      <span>
        <strong>API</strong>
        <small>Consulta pelo sistema</small>
      </span>
    </button>
  </div>
</template>

<style scoped src="../assets/css/seletor-metodo-entrada.css"></style>
