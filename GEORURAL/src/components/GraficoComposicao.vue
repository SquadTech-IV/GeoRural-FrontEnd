<script setup>
defineProps({
  total: { type: Number, required: true },
  imoveis: { type: Number, required: true },
  series: { type: Array, required: true },
})
const fmt = (v) => Number(v).toLocaleString('pt-BR')
const fmtPct = (v) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
</script>
<template>
  <section class="pg-bloco" style="margin: 0">
    <p class="graf-titulo">Composição por situação</p>
    <p class="graf-sub">
      {{ fmt(total) }} resultados em {{ fmt(imoveis) }} imóveis na consulta atual
    </p>
    <div v-if="series.length" class="graf-barra" aria-label="Distribuição por situação">
      <i
        v-for="serie in series"
        :key="serie.situacao ?? 'sem-situacao'"
        :style="{ width: serie.percentual + '%', backgroundColor: serie.cor }"
        :title="serie.rotulo + ': ' + serie.quantidade + ' (' + fmtPct(serie.percentual) + '%)'"
      />
    </div>
    <p v-else class="pg-vazio">Nenhum resultado para compor o gráfico.</p>
    <dl class="graf-legenda">
      <div v-for="serie in series" :key="serie.situacao ?? 'sem-situacao'">
        <dt>
          <span class="graf-ponto" :style="{ backgroundColor: serie.cor }" />{{ serie.rotulo }}
        </dt>
        <dd>
          {{ fmt(serie.quantidade) }}<span>{{ fmtPct(serie.percentual) }}%</span>
        </dd>
      </div>
    </dl>
  </section>
</template>
<style scoped>
@import '../assets/css/resultados-indicadores.css';
</style>
