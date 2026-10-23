<script setup>
defineProps({
  arquivos: {
    type: Array,
    default: () => [],
  },
  selecionado: {
    type: [String, Number],
    default: '',
  },
  carregando: {
    type: Boolean,
    default: false,
  },
  falhou: {
    type: Boolean,
    default: false,
  },
  possuiConjunto: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['selecionar', 'tentar-novamente'])
</script>

<template>
  <section
    class="rastreabilidade-lista"
    aria-labelledby="titulo-lista-arquivos"
    :aria-busy="carregando"
  >
    <h2
      id="titulo-lista-arquivos"
      class="rastreabilidade-lista-titulo"
    >
      Arquivos do conjunto
    </h2>

    <div
      v-if="carregando"
      class="rastreabilidade-estado"
      role="status"
    >
      Carregando arquivos...
    </div>

    <div
      v-else-if="!possuiConjunto"
      class="rastreabilidade-estado"
    >
      Selecione um conjunto para consultar seus arquivos.
    </div>

    <div
      v-else-if="falhou"
      class="rastreabilidade-estado"
    >
      <button
        type="button"
        class="rastreabilidade-botao"
        @click="emit('tentar-novamente')"
      >
        Tentar novamente
      </button>
    </div>

    <div
      v-else-if="!arquivos.length"
      class="rastreabilidade-estado"
      role="status"
    >
      Nenhum arquivo encontrado para este conjunto.
    </div>

    <div v-else class="rastreabilidade-arquivos">
      <button
        v-for="arquivo in arquivos"
        :key="arquivo.id"
        type="button"
        class="rastreabilidade-arquivo"
        :class="{
          'rastreabilidade-arquivo--ativo':
            String(arquivo.id) === String(selecionado),
        }"
        :aria-pressed="
          String(arquivo.id) === String(selecionado)
        "
        @click="emit('selecionar', arquivo.id)"
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
          <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
          <path d="M14 3v6h6M8 13h8M8 17h6" />
        </svg>

        <span class="rastreabilidade-arquivo-informacoes">
          <strong :title="arquivo.nome">
            {{ arquivo.nome }}
          </strong>

          <small v-if="arquivo.formato">
            {{ arquivo.formato }}
          </small>
        </span>
      </button>
    </div>
  </section>
</template>

<style scoped src="../assets/css/rastreabilidade.css"></style>
