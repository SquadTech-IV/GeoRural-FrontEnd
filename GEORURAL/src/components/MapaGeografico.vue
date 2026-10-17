<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import 'maplibre-gl/dist/maplibre-gl.css'
import ControlesCamera from './ControlesCamera.vue'
import { criarMapa } from '../services/mapaRenderizacaoService'
import { criarControleCamadas } from '../services/camadasIndicadoresService'
import {
  modosVisualizacao,
  prepararVisualizacao,
  aplicarVisibilidadeImovel,
} from '../services/visualizacaoMapaService'
import { criarControleTerreno } from '../services/terrenoMapaService'
import {
  basesMapa,
  criarControleBase,
} from '../services/baseMapaService'

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
  'terreno-alterado',
])

const container = ref(null)
const carregando = ref(true)
const pronto = ref(false)
const mensagemErro = ref('')
const mensagemModo = ref('')
const modo = ref('completo')
const terrenoAtivo = ref(false)
const baseSelecionada = ref('ruas')
const legendaIndicadores = ref([])
const mostrarImovelLegenda = ref(false)

let instancia = null
let controleCamadas = null
let controleTerreno = null
let controleBase = null
let desmontado = false

function informarErro(erro) {
  carregando.value = false

  mensagemErro.value =
    erro instanceof Error
      ? erro.message
      : 'Não foi possível carregar o mapa.'

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

    legendaIndicadores.value = controleCamadas.atualizar(
      visualizacao.indicadores,
    )

    aplicarVisibilidadeImovel(
      instancia.mapa,
      visualizacao.mostrarImovel,
    )

    mostrarImovelLegenda.value =
      visualizacao.mostrarImovel && visualizacao.possuiImovel

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

function alterarTerreno(ativo) {
  if (
    !pronto.value ||
    carregando.value ||
    !controleTerreno
  ) {
    return
  }

  try {
    controleTerreno.definirAtivo(ativo)

    terrenoAtivo.value = ativo
    mensagemErro.value = ''

    emit('terreno-alterado', ativo)
  } catch (erro) {
    informarErro(erro)
  }
}

function alterarBase(evento) {
  if (
    !pronto.value ||
    carregando.value ||
    !controleBase
  ) {
    return
  }

  const novaBase = evento.target.value

  try {
    controleBase.alterarBase(novaBase)

    baseSelecionada.value = novaBase
    mensagemErro.value = ''
  } catch (erro) {
    evento.target.value = baseSelecionada.value

    informarErro(erro)
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
  controleBase = null

  if (controleTerreno) {
    controleTerreno.destruir()
    controleTerreno = null
  }

  if (controleCamadas) {
    controleCamadas.limpar()
    controleCamadas = null
  }

  if (instancia) {
    instancia.destruir()
    instancia = null
  }

  legendaIndicadores.value = []
  mostrarImovelLegenda.value = false
}

function iniciarMapa() {
  if (desmontado || !container.value) return

  destruirMapa()

  carregando.value = true
  mensagemErro.value = ''
  mensagemModo.value = ''

  try {
    instancia = criarMapa({
      container: container.value,
      geojson: props.geojson,

      aoCarregar(mapa) {
        if (desmontado) return

        try {
          controleCamadas = criarControleCamadas(mapa)
          controleTerreno = criarControleTerreno(mapa)
          controleBase = criarControleBase(mapa)

          controleBase.alterarBase(baseSelecionada.value)

          carregando.value = false
          pronto.value = true

          aplicarVisualizacao(modo.value)

          if (terrenoAtivo.value) {
            try {
              controleTerreno.definirAtivo(true, {
                animar: false,
              })
            } catch (erro) {
              terrenoAtivo.value = false

              informarErro(erro)
            }
          }

          emit('carregado', mapa)
        } catch (erro) {
          informarErro(erro)
        }
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
  alterarTerreno,
})
</script>

<template>
  <section
    class="mapa-geografico"
    aria-label="Mapa do imóvel e dos indicadores"
    :aria-busy="carregando"
  >
    <div
      ref="container"
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
      <div class="mapa-geografico-base">
        <label for="mapa-base-selecionada">
          Base do mapa
        </label>

        <select
          id="mapa-base-selecionada"
          :value="baseSelecionada"
          :disabled="!pronto || carregando"
          @change="alterarBase"
        >
          <option
            v-for="base in basesMapa"
            :key="base.id"
            :value="base.id"
          >
            {{ base.nome }}
          </option>
        </select>
      </div>

      <div
        class="mapa-geografico-terreno"
        role="group"
        aria-label="Visualização do terreno"
      >
        <button
          type="button"
          :aria-pressed="!terrenoAtivo"
          :disabled="!pronto || carregando"
          @click="alterarTerreno(false)"
        >
          2D
        </button>

        <button
          type="button"
          :aria-pressed="terrenoAtivo"
          :disabled="!pronto || carregando"
          @click="alterarTerreno(true)"
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
            <path d="m3 20 7-13 4 7 3-5 4 11H3Z" />
            <path d="m8 11 2 2 2-2" />
          </svg>

          Relevo 3D
        </button>
      </div>

      <div
        class="mapa-geografico-modos"
        role="group"
        aria-label="Modo de visualização das camadas"
      >
        <button
          v-for="opcao in modosVisualizacao"
          :key="opcao.id"
          type="button"
          :class="{
            'mapa-geografico-modo--ativo': modo === opcao.id,
          }"
          :aria-pressed="modo === opcao.id"
          :disabled="!pronto || carregando"
          @click="alterarModo(opcao.id)"
        >
          {{ opcao.nome }}
        </button>
      </div>

      <ControlesCamera
        v-if="pronto"
        :mapa="obterMapa()"
        @erro="informarErro"
      />

      <div
        v-if="pronto && !carregando"
        class="mapa-geografico-legenda"
        aria-label="Legenda das camadas"
      >
        <strong>Legenda</strong>

        <div v-if="mostrarImovelLegenda">
          <span
            class="mapa-geografico-legenda-cor"
            style="background-color: var(--cor-roxo)"
            aria-hidden="true"
          ></span>

          <span>Limite do imóvel</span>
        </div>

        <div
          v-for="indicador in legendaIndicadores"
          :key="indicador.id"
        >
          <span
            class="mapa-geografico-legenda-cor"
            :style="{ backgroundColor: indicador.cor }"
            aria-hidden="true"
          ></span>

          <span>{{ indicador.nome }}</span>
        </div>

        <p
          v-if="
            !mostrarImovelLegenda &&
            !legendaIndicadores.length
          "
          class="mapa-geografico-legenda-vazia"
        >
          Nenhuma camada disponível.
        </p>

        <p
          v-if="terrenoAtivo"
          class="mapa-geografico-terreno-info"
        >
          Elevação DEM · escala vertical 1×
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
