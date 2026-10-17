<script setup>
import {
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'
import 'maplibre-gl/dist/maplibre-gl.css'
import { criarMapa } from '../services/mapaRenderizacaoService'
import {
  criarControleCamadas,
} from '../services/camadasIndicadoresService'

defineOptions({
  name: 'MapaGeografico',
})

const props = defineProps({
  geojson: {
    type: [Object, String],
    default: null,
  },
  indicadores: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits([
  'carregado',
  'erro',
])

const containerMapa = ref(null)
const carregando = ref(true)
const mensagemErro = ref('')
const legendaIndicadores = ref([])

let instancia = null
let controleCamadas = null
let desmontado = false

function informarErro(erro) {
  carregando.value = false

  mensagemErro.value =
    erro.message || 'Não foi possível carregar o mapa.'

  emit('erro', erro)
}

function atualizarIndicadores() {
  if (!controleCamadas || desmontado) return

  try {
    legendaIndicadores.value =
      controleCamadas.atualizar(props.indicadores)
  } catch (erro) {
    informarErro(erro)
  }
}

function atualizarImovel(valor) {
  if (!instancia || desmontado) return

  try {
    instancia.atualizarGeoJson(valor)
  } catch (erro) {
    informarErro(erro)
  }
}

function destruirMapa() {
  controleCamadas?.limpar()
  controleCamadas = null

  instancia?.destruir()
  instancia = null

  legendaIndicadores.value = []
}

function iniciarMapa() {
  if (desmontado) return

  destruirMapa()

  carregando.value = true
  mensagemErro.value = ''

  try {
    instancia = criarMapa({
      container: containerMapa.value,
      geojson: props.geojson,

      aoCarregar(mapa) {
        if (desmontado) return

        controleCamadas = criarControleCamadas(mapa)

        carregando.value = false

        atualizarIndicadores()

        emit('carregado', mapa)
      },

      aoFalhar(erro) {
        if (desmontado) return

        informarErro(erro)
      },
    })
  } catch (erro) {
    informarErro(erro)
  }
}

function obterMapa() {
  return instancia?.mapa ?? null
}

watch(
  () => props.geojson,
  atualizarImovel,
  { deep: true },
)

watch(
  () => props.indicadores,
  atualizarIndicadores,
  { deep: true },
)

onMounted(iniciarMapa)

onBeforeUnmount(() => {
  desmontado = true
  destruirMapa()
})

defineExpose({
  obterMapa,
  reiniciar: iniciarMapa,
})
</script>

<template>
  <section
    class="mapa-geografico"
    aria-label="Mapa do imóvel e dos indicadores"
    :aria-busy="carregando"
  >
    <div
      ref="containerMapa"
      class="mapa-geografico-container"
    ></div>

    <div
      v-if="carregando"
      class="mapa-geografico-carregando"
      role="status"
    >
      <span
        class="mapa-geografico-spinner"
        aria-hidden="true"
      ></span>

      <span>Carregando mapa...</span>
    </div>

    <div
      v-if="!carregando"
      class="mapa-geografico-legenda"
      aria-label="Legenda das camadas"
    >
      <strong>Legenda</strong>

      <div v-if="geojson">
        <span
          class="mapa-geografico-legenda-cor"
          style="background: #b400ff"
        ></span>

        <span>Limite do imóvel</span>
      </div>

      <div
        v-for="camada in legendaIndicadores"
        :key="camada.id"
      >
        <span
          class="mapa-geografico-legenda-cor"
          :style="{ background: camada.cor }"
        ></span>

        <span>{{ camada.nome }}</span>
      </div>

      <p
        v-if="!geojson && !legendaIndicadores.length"
        class="mapa-geografico-legenda-vazia"
      >
        Nenhuma geometria recebida.
      </p>
    </div>

    <div
      v-if="mensagemErro"
      class="mapa-geografico-erro"
      role="alert"
    >
      <p>{{ mensagemErro }}</p>

      <button
        type="button"
        @click="iniciarMapa"
      >
        Tentar novamente
      </button>
    </div>
  </section>
</template>

<style scoped src="../assets/css/mapa-geografico.css"></style>
