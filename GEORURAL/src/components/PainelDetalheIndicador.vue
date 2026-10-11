<script setup>
import { computed } from 'vue'

const props = defineProps({
  indicador: {
    type: Object,
    default: null,
  },
  carregando: {
    type: Boolean,
    default: false,
  },
  erro: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['tentar-novamente'])

const titulo = computed(() => {
  if (!props.indicador) return 'Detalhes do indicador'

  return [
    props.indicador.codigo,
    props.indicador.nome,
  ]
    .filter(Boolean)
    .join(' · ')
})

const configuravel = computed(() => {
  if (!props.indicador) return null

  if (typeof props.indicador.possuiParametros === 'boolean') {
    return props.indicador.possuiParametros
  }

  if (Array.isArray(props.indicador.parametros)) {
    return props.indicador.parametros.length > 0
  }

  return null
})

const formula = computed(() => {
  const valor = props.indicador?.formula

  return typeof valor === 'string' ? valor.trim() : ''
})

const exemplo = computed(() => {
  const valor = props.indicador?.exemplo

  return typeof valor === 'string' ? valor.trim() : ''
})
</script>

<template>
  <section
    class="regras-detalhe"
    aria-labelledby="titulo-detalhe-indicador"
    :aria-busy="carregando"
  >
    <header class="regras-detalhe-cabecalho">
      <div>
        <h2 id="titulo-detalhe-indicador">
          {{ titulo }}
        </h2>

        <p v-if="!indicador">
          Selecione um indicador para consultar suas informações.
        </p>

        <template v-else>
          <p v-if="indicador.descricao">
            {{ indicador.descricao }}
          </p>

          <small>
            Versão vigente:
            {{ indicador.versaoVigente ?? '—' }}
          </small>
        </template>
      </div>

      <span
        v-if="indicador && configuravel !== null"
        class="regras-etiqueta"
      >
        {{ configuravel ? 'Configurável' : 'Consulta' }}
      </span>
    </header>

    <div
      v-if="carregando"
      class="painel-detalhe-estado"
      role="status"
    >
      Carregando os detalhes do indicador...
    </div>

    <div
      v-else-if="erro"
      class="painel-detalhe-estado"
      role="alert"
    >
      <p class="regras-erro">
        {{ erro }}
      </p>

      <button
        type="button"
        class="regras-botao"
        @click="emit('tentar-novamente')"
      >
        Tentar novamente
      </button>
    </div>

    <p
      v-else-if="!indicador"
      class="regras-texto-secundario"
    >
      Os detalhes serão apresentados após selecionar
      um indicador na lista.
    </p>

    <div v-else class="painel-detalhe-conteudo">
      <details
        :key="indicador.id"
        class="regras-calculo"
      >
        <summary class="regras-formula-botao">
          <span>Como é calculado</span>

          <svg
            class="regras-formula-seta"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </summary>

        <div class="regras-calculo-conteudo">
          <div v-if="formula" class="regras-formula">
            {{ formula }}
          </div>

          <p v-else class="regras-texto-secundario">
            Nenhum método de cálculo carregado.
          </p>

          <p v-if="exemplo" class="regras-exemplo">
            <strong>Exemplo:</strong>
            {{ exemplo }}
          </p>
        </div>
      </details>

      <slot :indicador="indicador"></slot>
    </div>
  </section>
</template>

<style scoped src="../assets/css/regras.css"></style>
