<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import {
  criarControleCamera,
} from '../services/cameraMapaService'

defineOptions({
  name: 'ControlesCamera',
})

const props = defineProps({
  mapa: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['erro'])

const rotacao = ref(0)
const inclinacao = ref(0)
const inclinacaoMinima = ref(0)
const inclinacaoMaxima = ref(60)

let controle = null

function executar(acao) {
  try {
    acao()
  } catch (erro) {
    emit('erro', erro)
  }
}

function alterarRotacao(evento) {
  executar(() => {
    controle?.definirRotacao(evento.target.value)
  })
}

function alterarInclinacao(evento) {
  executar(() => {
    controle?.definirInclinacao(evento.target.value)
  })
}

function apontarNorte() {
  executar(() => {
    controle?.apontarNorte()
  })
}

function vistaSuperior() {
  executar(() => {
    controle?.vistaSuperior()
  })
}

watch(
  () => props.mapa,
  (mapa) => {
    controle?.destruir()
    controle = null

    if (!mapa) return

    executar(() => {
      controle = criarControleCamera(mapa, {
        aoAlterar(estado) {
          rotacao.value = estado.rotacao
          inclinacao.value = estado.inclinacao
          inclinacaoMinima.value = estado.inclinacaoMinima
          inclinacaoMaxima.value = estado.inclinacaoMaxima
        },
      })
    })
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  controle?.destruir()
  controle = null
})
</script>

<template>
  <section
    class="camera-controles"
    aria-label="Controles da câmera"
  >
    <header class="camera-cabecalho">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="m15 9-2 4-4 2 2-4 4-2Z" />
      </svg>

      <h3>Câmera</h3>
    </header>

    <div class="camera-campo">
      <div class="camera-label">
        <label for="camera-rotacao">
          Rotação
        </label>

        <output for="camera-rotacao">
          {{ rotacao }}°
        </output>
      </div>

      <input
        id="camera-rotacao"
        type="range"
        min="-180"
        max="180"
        step="1"
        :value="rotacao"
        :aria-valuetext="`${rotacao} graus`"
        @input="alterarRotacao"
      />

      <div class="camera-limites" aria-hidden="true">
        <span>−180°</span>
        <span>0° · Norte</span>
        <span>180°</span>
      </div>
    </div>

    <div class="camera-campo">
      <div class="camera-label">
        <label for="camera-inclinacao">
          Inclinação
        </label>

        <output for="camera-inclinacao">
          {{ inclinacao }}°
        </output>
      </div>

      <input
        id="camera-inclinacao"
        type="range"
        :min="inclinacaoMinima"
        :max="inclinacaoMaxima"
        step="1"
        :value="inclinacao"
        :aria-valuetext="`${inclinacao} graus`"
        @input="alterarInclinacao"
      />

      <div class="camera-limites" aria-hidden="true">
        <span>{{ inclinacaoMinima }}°</span>
        <span>{{ inclinacaoMaxima }}°</span>
      </div>
    </div>

    <div class="camera-acoes">
      <button
        type="button"
        @click="apontarNorte"
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
          <path d="m12 3 6 17-6-4-6 4 6-17Z" />
        </svg>

        Norte
      </button>

      <button
        type="button"
        @click="vistaSuperior"
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
          <path d="m12 3 9 5-9 5-9-5 9-5Z" />
          <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
        </svg>

        Vista superior
      </button>
    </div>

    <p class="camera-ajuda">
      A inclinação altera o ângulo da câmera.
      Ative o relevo 3D para visualizar as elevações do terreno.
    </p>
  </section>
</template>

<style scoped src="../assets/css/controles-camera.css"></style>
