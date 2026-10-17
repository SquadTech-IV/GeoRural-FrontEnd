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
  indicadores: {
    type: Array,
    default: () => [],
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
          Consulte o limite do imóvel e as geometrias
          dos indicadores disponíveis.
        </p>
      </div>
    </header>

    <div class="mapa-base-conteudo">
      <MapaGeografico
        :geojson="geojson"
        :indicadores="indicadores"
      />
    </div>
  </main>
</template>

<style scoped src="../assets/css/mapa-base.css"></style>
