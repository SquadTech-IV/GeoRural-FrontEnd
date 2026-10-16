<script setup>
import {
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'
import 'maplibre-gl/dist/maplibre-gl.css'
import { criarMapa } from '../services/mapaRenderizacaoService'

defineOptions({
  name: 'MapaGeografico',
})

const props = defineProps({
  geojson: {
    type: [Object, String],
    default: null,
  },
})

const emit = defineEmits([
  'carregado',
  'erro',
])

const containerMapa = ref(null)
const carregando = ref(true)
const mensagemErro = ref('')

let instancia = null
let desmontado = false

function informarErro(erro) {
  carregando.value = false
  mensagemErro.value =
    erro.message || 'Não foi possível carregar o mapa.'

  emit('erro', erro)
}

function iniciarMapa() {
  if (desmontado) return

  instancia?.destruir()
  instancia = null

  carregando.value = true
  mensagemErro.value = ''

  try {
    instancia = criarMapa({
      container: containerMapa.value,
      geojson: props.geojson,

      aoCarregar(mapa) {
        if (desmontado) return

        carregando.value = false
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

function atualizarDados(valor) {
  if (!instancia || desmontado) return

  try {
    instancia.atualizarGeoJson(valor)
  } catch (erro) {
    informarErro(erro)
  }
}

function obterMapa() {
  return instancia?.mapa ?? null
}

watch(
  () => props.geojson,
  atualizarDados,
  { deep: true },
)

onMounted(iniciarMapa)

onBeforeUnmount(() => {
  desmontado = true
  instancia?.destruir()
  instancia = null
})

defineExpose({
  obterMapa,
  reiniciar: iniciarMapa,
})
</script>

<template>
  <section
    class="mapa-geografico"
    aria-label="Mapa geográfico"
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
