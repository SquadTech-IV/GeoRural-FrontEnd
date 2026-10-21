<script setup>
import {
  onBeforeUnmount,
  ref,
  watch,
} from 'vue'

import {
  consultaIngestaoCancelada,
  ingestaoService,
} from '../services/ingestaoService'

const props = defineProps({
  conjuntoId: {
    type: [String, Number],
    default: null,
  },
  desabilitado: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'consultado',
  'limpar',
])

const consultando = ref(false)
const erro = ref('')
const concluida = ref(false)

let consulta = null

function limparConsulta() {
  consulta?.abort()
  consulta = null

  consultando.value = false
  erro.value = ''
  concluida.value = false

  emit('limpar')
}

watch(
  () => props.conjuntoId,
  limparConsulta,
)

async function consultar() {
  if (props.desabilitado || consultando.value) return

  consulta?.abort()

  const atual = new AbortController()
  consulta = atual

  consultando.value = true
  erro.value = ''
  concluida.value = false

  emit('limpar')

  try {
    const resposta =
      await ingestaoService.consultarDisponiveis(
        props.conjuntoId,
        {
          signal: atual.signal,
        },
      )

    if (
      atual.signal.aborted ||
      consulta !== atual
    ) {
      return
    }

    concluida.value = true

    emit('consultado', {
      conjuntoId: props.conjuntoId,
      resposta,
    })
  } catch (falha) {
    if (
      atual.signal.aborted ||
      consulta !== atual ||
      consultaIngestaoCancelada(falha)
    ) {
      return
    }

    erro.value = falha.message
  } finally {
    if (consulta === atual) {
      consultando.value = false
      consulta = null
    }
  }
}

onBeforeUnmount(() => {
  consulta?.abort()
})
</script>

<template>
  <section
    class="consulta-api"
    aria-labelledby="consulta-api-titulo"
    :aria-busy="consultando"
  >
    <h3 id="consulta-api-titulo">
      Entrada por API
    </h3>

    <p class="consulta-api-descricao">
      Consulte os itens disponibilizados pela API configurada
      para o conjunto selecionado.
    </p>

    <button
      type="button"
      class="consulta-api-botao"
      :disabled="
        desabilitado ||
        consultando ||
        conjuntoId == null ||
        conjuntoId === ''
      "
      @click="consultar"
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
        <path d="M20 7v5h-5" />
        <path d="M4 17v-5h5" />
        <path d="M6.1 7a7 7 0 0 1 11.6-2L20 8" />
        <path d="M4 16l2.3 3A7 7 0 0 0 17.9 17" />
      </svg>

      {{
        consultando
          ? 'Consultando API...'
          : erro
            ? 'Tentar novamente'
            : 'Consultar disponibilidade'
      }}
    </button>

    <p
      v-if="conjuntoId == null || conjuntoId === ''"
      class="consulta-api-ajuda"
    >
      Selecione uma fonte e um conjunto para continuar.
    </p>

    <p
      v-if="consultando"
      class="consulta-api-ajuda"
      role="status"
    >
      Aguarde a resposta do backend.
    </p>

    <p
      v-if="concluida"
      class="consulta-api-sucesso"
      role="status"
    >
      Consulta concluída pelo backend.
    </p>

    <p
      v-if="erro"
      class="consulta-api-erro"
      role="alert"
    >
      {{ erro }}
    </p>
  </section>
</template>

<style scoped src="../assets/css/consulta-api-ingestao.css"></style>
