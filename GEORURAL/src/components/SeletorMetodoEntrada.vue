<script setup>
defineProps({
  modelValue: {
    type: String,
    default: 'upload',
    validator: valor =>
      ['upload', 'api'].includes(valor),
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
        'metodo-entrada-opcao--ativo':
          modelValue === 'upload',
      }"
      :aria-pressed="modelValue === 'upload'"
      :disabled="desabilitado"
      @click="emit('update:modelValue', 'upload')"
    >
      Upload
    </button>

    <button
      type="button"
      class="metodo-entrada-opcao"
      :class="{
        'metodo-entrada-opcao--ativo':
          modelValue === 'api',
      }"
      :aria-pressed="modelValue === 'api'"
      :disabled="desabilitado"
      @click="emit('update:modelValue', 'api')"
    >
      API
    </button>
  </div>
</template>

<style scoped src="../assets/css/seletor-metodo-entrada.css"></style>
