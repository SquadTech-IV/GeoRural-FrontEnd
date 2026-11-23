<script setup>
import { computed } from 'vue'

const props = defineProps({
  titulo: { type: String, default: 'Distribuição do indicador' },
  subtitulo: {
    type: String,
    default: 'Quantidade de resultados por faixa no filtro aplicado.',
  },
  faixas: { type: Array, required: true },
  valores: { type: Array, required: true },
})

const fmt = (v) => Number(v ?? 0).toLocaleString('pt-BR')

const maiorValor = computed(() => Math.max(...props.valores, 1))
</script>

<template>
  <section class="pg-bloco" style="margin: 0">
    <p class="graf-titulo">{{ titulo }}</p>
    <p class="graf-sub">{{ subtitulo }}</p>

    <p v-if="!valores.length" class="pg-vazio">Nenhum resultado para distribuir.</p>
    <div v-else class="graf-colunas">
      <div
        v-for="(valor, idx) in valores"
        :key="faixas[idx]"
        class="graf-coluna"
        :title="`${faixas[idx]}: ${fmt(valor)} resultados`"
      >
        <b>{{ fmt(valor) }}</b>
        <i
          :style="{ height: `${(valor / maiorValor) * 100}%`, minHeight: valor > 0 ? '2px' : '0' }"
        ></i>
      </div>
    </div>

    <div class="graf-eixo">
      <span v-for="faixa in faixas" :key="faixa">
        {{ faixa }}
      </span>
    </div>
  </section>
</template>

<style scoped>
@import '../assets/css/resultados-indicadores.css';
</style>
