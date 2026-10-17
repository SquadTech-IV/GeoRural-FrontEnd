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
import {
  modosVisualizacao,
  prepararVisualizacao,
  aplicarVisibilidadeImovel,
} from '../services/visualizacaoMapaService'

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
  'modo-alterado',
])

const containerMapa = ref(null)
const carregando = ref(true)
const pronto = ref(false)
const mensagemErro = ref('')
const mensagemModo = ref('')
const modo = ref('completo')

const legendaIndicadores = ref([])
const mostrarImovelLegenda = ref(false)

let instancia = null
let controleCamadas = null
let desmontado = false

function informarErro(erro) {
  carregando.value = false

  mensagemErro.value =
    erro.message || 'Não foi possível carregar o mapa.'

  emit('erro', erro)
}

function aplicarVisualizacao(novoModo) {
  if (!instancia || !controleCamadas || desmontado) {
    return false
  }

  try {
    const visualizacao = prepararVisualizacao({
      limite: props.geojson,
      indicadores: props.indicadores,
      modo: novoModo,
    })

    const legenda = controleCamadas.atualizar(
      visualizacao.indicadores,
    )

    aplicarVisibilidadeImovel(
      instancia.mapa,
      visualizacao.mostrarImovel,
    )

    legendaIndicadores.value = legenda

    mostrarImovelLegenda.value =
      visualizacao.mostrarImovel &&
      visualizacao.possuiImovel

    mensagemModo.value = visualizacao.mensagem
    mensagemErro.value = ''

    return true
  } catch (erro) {
    informarErro(erro)
    return false
  }
}

function alterarModo(novoModo) {
  if (!pronto.value || carregando.value) return

  if (aplicarVisualizacao(novoModo)) {
    modo.value = novoModo
    emit('modo-alterado', novoModo)
  }
}

function atualizarDados() {
  if (!instancia || desmontado) return

  try {
    instancia.atualizarGeoJson(props.geojson)

    if (!controleCamadas) return

    if (!aplicarVisualizacao(modo.value)) {
      controleCamadas.limpar()
      instancia.atualizarGeoJson(null, false)

      legendaIndicadores.value = []
      mostrarImovelLegenda.value = false
      mensagemModo.value = ''
    }
  } catch (erro) {
    controleCamadas?.limpar()
    instancia.atualizarGeoJson(null, false)

    legendaIndicadores.value = []
    mostrarImovelLegenda.value = false
    mensagemModo.value = ''

    informarErro(erro)
  }
}

function atualizarIndicadores() {
  if (!controleCamadas || desmontado) return

  if (!aplicarVisualizacao(modo.value)) {
    controleCamadas.limpar()
    legendaIndicadores.value = []
  }
}

function destruirMapa() {
  pronto.value = false

  controleCamadas?.limpar()
  controleCamadas = null

  instancia?.destruir()
  instancia = null

  legendaIndicadores.value = []
  mostrarImovelLegenda.value = false
}

function iniciarMapa() {
  if (desmontado) return

  destruirMapa()

  carregando.value = true
  mensagemErro.value = ''
  mensagemModo.value = ''

  try {
    instancia = criarMapa({
      container: containerMapa.value,
      geojson: props.geojson,

      aoCarregar(mapa) {
        if (desmontado) return

        controleCamadas = criarControleCamadas(mapa)

        carregando.value = false
        pronto.value = true

        aplicarVisualizacao(modo.value)

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
  atualizarDados,
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
  alterarModo,
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

    <div class="mapa-geografico-painel-controles">
      <div
        class="mapa-geografico-modos"
        role="group"
        aria-label="Modo de visualização"
      >
        <button
          v-for="opcao in modosVisualizacao"
          :key="opcao.id"
          type="button"
          :disabled="!pronto || carregando"
          :aria-pressed="modo === opcao.id"
          :class="{
            'mapa-geografico-modo--ativo':
              modo === opcao.id,
          }"
          @click="alterarModo(opcao.id)"
        >
          {{ opcao.nome }}
        </button>
      </div>

      <div
        v-if="!carregando"
        class="mapa-geografico-legenda"
        aria-label="Legenda das camadas visíveis"
      >
        <strong>Legenda</strong>

        <div v-if="mostrarImovelLegenda">
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
          v-if="
            !mostrarImovelLegenda &&
            !legendaIndicadores.length
          "
          class="mapa-geografico-legenda-vazia"
        >
          Nenhuma geometria visível.
        </p>
      </div>
    </div>

    <p
      v-if="mensagemModo && !mensagemErro"
      class="mapa-geografico-aviso-modo"
      role="status"
    >
      {{ mensagemModo }}
    </p>

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
