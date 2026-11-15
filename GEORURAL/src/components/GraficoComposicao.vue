<script setup>
import { computed } from 'vue'

const props = defineProps({
  total: { type: Number, required: true },
  bons: { type: Number, required: true },
  ruins: { type: Number, required: true },
  rotuloBom: { type: String, required: true },
  rotuloRuim: { type: String, required: true },
})

const fmt = (v) => Number(v ?? 0).toLocaleString('pt-BR')
const fmtPct = (v) => Number(v ?? 0).toFixed(1).replace('.', ',')

const pctBons = computed(() => (props.bons / (props.total || 1)) * 100)
const pctRuins = computed(() => (props.ruins / (props.total || 1)) * 100)
</script>

<template>
  <section class="pg-bloco" style="margin: 0">
    <p class="graf-titulo">Composição por situação</p>
    <p class="graf-sub">{{ fmt(total) }} imóveis na consulta atual</p>

    <div class="graf-barra">
      <i
        class="graf-fatia--bom"
        :style="{ width: `${pctBons}%` }"
        :title="`${rotuloBom}: ${bons}`"
      ></i>
      <i
        class="graf-fatia--ruim"
        :style="{ width: `${pctRuins}%` }"
        :title="`${rotuloRuim}: ${ruins}`"
      ></i>
    </div>

    <dl class="graf-legenda">
      <div>
        <dt>
          <span class="graf-ponto graf-ponto--bom"></span>
          {{ rotuloBom }}
        </dt>
        <dd>
          {{ fmt(bons) }}
          <span>{{ fmtPct(pctBons) }}%</span>
        </dd>
      </div>
      <div>
        <dt>
          <span class="graf-ponto graf-ponto--ruim"></span>
          {{ rotuloRuim }}
        </dt>
        <dd>
          {{ fmt(ruins) }}
          <span>{{ fmtPct(pctRuins) }}%</span>
        </dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
@import '../assets/css/resultados-indicadores.css';
</style>
