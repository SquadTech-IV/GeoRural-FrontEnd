<script setup>
import { RouterLink } from 'vue-router'
import BarraNavegacao from '../components/BarraNavegacao.vue'
import MapaGeografico from '../components/MapaGeografico.vue'

defineOptions({
  name: 'MapaIndicadores',
})

defineProps({
  geojson: {
    type: [Object, String],
    default: null,
  },
})
</script>

<template>
  <BarraNavegacao />

  <main class="mapa-base-pagina">
    <header class="mapa-base-cabecalho">
      <div>
        <RouterLink
          to="/imoveis"
          class="mapa-base-voltar"
        >
          ‹ Voltar para imóveis
        </RouterLink>

        <h1>Mapa de indicadores</h1>

        <p>
          Visualização geográfica dos imóveis
          e das camadas utilizadas nas análises.
        </p>
      </div>
    </header>

    <div class="mapa-base-conteudo">
      <MapaGeografico :geojson="geojson" />
    </div>
  </main>
</template>

<style scoped src="../assets/css/mapa-base.css"></style>
