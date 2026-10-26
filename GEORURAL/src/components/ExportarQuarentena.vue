<script setup>
import { ref } from 'vue'

import {
  exportarRegistrosQuarentena,
} from '../services/quarentenaExportacaoService'

const props = defineProps({
  registros: {
    type: Array,
    default: () => [],
  },
  execucaoId: {
    type: [String, Number],
    default: '',
  },
  desabilitado: {
    type: Boolean,
    default: false,
  },
  listaParcial: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['erro'])

const exportando = ref(false)

function exportar() {
  if (
    props.desabilitado ||
    exportando.value ||
    !props.registros.length
  ) {
    return
  }

  exportando.value = true

  try {
    exportarRegistrosQuarentena(
      props.registros,
      props.execucaoId,
    )
  } catch (erro) {
    emit(
      'erro',
      erro.message ||
        'Não foi possível gerar o arquivo CSV.',
    )
  } finally {
    exportando.value = false
  }
}
</script>

<template>
  <div class="quarentena-exportacao">
    <p>
      {{
        listaParcial
          ? 'Exporta os registros filtrados da página carregada.'
          : 'Exporta os registros carregados que correspondem aos filtros atuais.'
      }}
    </p>

    <button
      type="button"
      class="quarentena-exportacao-botao"
      :disabled="
        desabilitado ||
        exportando ||
        !registros.length ||
        !execucaoId
      "
      @click="exportar"
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
        <path d="M12 3v12m-5-5 5 5 5-5" />
        <path d="M4 16v5h16v-5" />
      </svg>

      {{
        exportando
          ? 'Gerando CSV...'
          : 'Exportar filtrados em CSV'
      }}
    </button>
  </div>
</template>

<style scoped src="../assets/css/exportar-quarentena.css"></style>
