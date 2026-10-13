<script setup>
import {
  computed,
  onMounted,
  ref,
  shallowRef,
  watch,
} from 'vue'
import { RouterLink } from 'vue-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  LControlScale,
  LGeoJson,
  LMap,
  LTileLayer,
} from '@vue-leaflet/vue-leaflet'
import BarraNavegacao from '../components/BarraNavegacao.vue'
import { imovelService } from '../services/imovelService'

const props = defineProps({
  car: {
    type: String,
    required: true,
  },
  resultado: {
    type: Object,
    default: null,
  },
})

const ESRI_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

const ESRI_ATTRIBUTION =
  'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'

const carregando = ref(true)
const erro = ref('')
const dados = ref(null)

const mapa = shallowRef(null)
const centro = ref(null)

const camadasUi = [
  {
    chave: 'limite',
    rotulo: 'Limite do imóvel',
    cor: '#b400ff',
  },
  {
    chave: 'embargos',
    rotulo: 'Embargos',
    cor: '#ff4d6d',
  },
]

const visiveis = ref(
  Object.fromEntries(
    camadasUi.map((camada) => [camada.chave, true]),
  ),
)

const estilos = {
  limite: () => ({
    color: '#b400ff',
    weight: 2,
    fillColor: '#b400ff',
    fillOpacity: 0.08,
  }),
  embargos: () => ({
    color: '#ff4d6d',
    weight: 2,
    fillColor: '#ff4d6d',
    fillOpacity: 0.45,
  }),
}

function normalizarGeoJson(valor) {
  if (!valor) return null

  const geojson =
    typeof valor === 'string' ? JSON.parse(valor) : valor

  const tiposAceitos = [
    'Feature',
    'FeatureCollection',
    'GeometryCollection',
    'Polygon',
    'MultiPolygon',
  ]

  if (!geojson || !tiposAceitos.includes(geojson.type)) {
    return null
  }

  if (
    geojson.type === 'FeatureCollection' &&
    !geojson.features?.length
  ) {
    return null
  }

  return geojson
}

async function buscarNoBackend() {
  try {
    return await imovelService.detalhe(props.car)
  } catch (erroRequisicao) {
    if (erroRequisicao.response?.status === 404) {
      throw new Error(
        'Nenhum imóvel encontrado para esse CAR.',
        { cause: erroRequisicao },
      )
    }

    throw new Error(
      'Não foi possível carregar os dados do imóvel. Tente novamente.',
      { cause: erroRequisicao },
    )
  }
}

async function carregarImovel() {
  carregando.value = true
  erro.value = ''
  dados.value = null

  try {
    const feature =
      props.resultado ?? (await buscarNoBackend())

    const propriedades = feature.properties ?? {}

    dados.value = {
      car: propriedades.codigoCar ?? props.car,
      areaTotalHa: propriedades.areaTotal,
      municipio: propriedades.municipio,
      limite: feature.geometry
        ? {
            type: 'Feature',
            geometry: feature.geometry,
            properties: {},
          }
        : null,
      embargos: normalizarGeoJson(feature.embargos),
      iae: propriedades.iae,
    }
  } catch (erroCarregamento) {
    erro.value =
      erroCarregamento.message ||
      'Não foi possível carregar os dados do imóvel. Tente novamente.'
  } finally {
    carregando.value = false
  }
}

function centralizarMapa() {
  if (!mapa.value || !dados.value?.limite) return

  const limites = L.geoJSON(dados.value.limite).getBounds()

  if (limites.isValid()) {
    mapa.value.fitBounds(limites, {
      padding: [60, 60],
    })
  }
}

watch(
  [mapa, dados],
  ([mapaAtual, dadosAtuais], _, onCleanup) => {
    if (!mapaAtual || !dadosAtuais?.limite) return

    centralizarMapa()

    const atualizarCentro = () => {
      centro.value = mapaAtual.getCenter()
    }

    atualizarCentro()
    mapaAtual.on('moveend', atualizarCentro)

    onCleanup(() => {
      mapaAtual.off('moveend', atualizarCentro)
    })
  },
)

const temIae = computed(() => dados.value?.iae != null)

const indicePercentual = computed(
  () => dados.value?.iae?.valorPercentual ?? 0,
)

const indiceHectares = computed(
  () => dados.value?.iae?.valorHectares ?? null,
)

function ha(valor) {
  if (valor == null) return '—'

  return `${Number(valor).toLocaleString('pt-BR', {
    maximumFractionDigits: 2,
  })} ha`
}

function dms(valor, positivo, negativo) {
  const absoluto = Math.abs(valor)
  const graus = Math.floor(absoluto)
  const minutos = Math.floor((absoluto - graus) * 60)
  const direcao = valor >= 0 ? positivo : negativo

  return `${graus}°${String(minutos).padStart(2, '0')}'${direcao}`
}

const coordenadas = computed(() => {
  if (!centro.value) return ''

  const latitude = dms(centro.value.lat, 'N', 'S')
  const longitude = dms(centro.value.lng, 'E', 'W')

  return `Lat ${latitude} · Lon ${longitude}`
})

onMounted(carregarImovel)
watch(() => props.car, carregarImovel)
</script>

<template>
  <BarraNavegacao />

  <div class="tela">
    <main
      v-if="carregando"
      class="estado"
      role="status"
    >
      Carregando dados do imóvel…
    </main>

    <main
      v-else-if="erro"
      class="estado erro"
      role="alert"
    >
      {{ erro }}
    </main>

    <main v-else class="corpo">
      <section class="mapa-painel">
        <LMap
          :key="car"
          class="mapa"
          :use-global-leaflet="false"
          :options="{
            zoomControl: false,
            attributionControl: true,
          }"
          @ready="(instancia) => (mapa = instancia)"
        >
          <LTileLayer
            :url="ESRI_TILE_URL"
            :attribution="ESRI_ATTRIBUTION"
            layer-type="base"
          />

          <template
            v-for="camada in camadasUi"
            :key="camada.chave"
          >
            <LGeoJson
              v-if="
                visiveis[camada.chave] &&
                dados[camada.chave]
              "
              :geojson="dados[camada.chave]"
              :options-style="estilos[camada.chave]"
            />
          </template>

          <LControlScale
            position="bottomright"
            :imperial="false"
          />
        </LMap>

        <div class="camadas">
          <span class="rotulo">Camadas</span>

          <label
            v-for="camada in camadasUi"
            :key="camada.chave"
            :class="{ apagada: !visiveis[camada.chave] }"
          >
            <input
              v-model="visiveis[camada.chave]"
              type="checkbox"
            />

            <span
              class="quadro"
              :style="
                visiveis[camada.chave]
                  ? { background: camada.cor }
                  : {}
              "
            />

            {{ camada.rotulo }}

            <i
              class="ponto"
              :style="{ background: camada.cor }"
            />
          </label>
        </div>

        <div class="zoom">
          <button
            type="button"
            aria-label="Aproximar"
            @click="mapa?.zoomIn()"
          >
            +
          </button>

          <button
            type="button"
            aria-label="Afastar"
            @click="mapa?.zoomOut()"
          >
            −
          </button>

          <button
            type="button"
            aria-label="Centralizar"
            @click="centralizarMapa"
          >
            ○
          </button>
        </div>

        <div class="coord">
          {{ coordenadas }}
        </div>
      </section>

      <aside class="lateral">
        <div class="card-indice">
          <div class="linha-topo">
            <div>
              <small>Imóvel analisado</small>
              <h1>{{ dados.car }}</h1>
            </div>

            <span
              v-if="!temIae"
              class="status pendente"
            >
              Sem resultado ainda
            </span>
          </div>

          <dl class="dados">
            <div>
              <dt>CAR</dt>
              <dd>{{ dados.car }}</dd>
            </div>

            <div>
              <dt>Área total</dt>
              <dd>{{ ha(dados.areaTotalHa) }}</dd>
            </div>

            <div>
              <dt>Município</dt>
              <dd>{{ dados.municipio ?? '—' }}</dd>
            </div>
          </dl>
        </div>

        <div v-if="temIae" class="card-indice">
          <div class="card-titulo">
            <strong>
              IAE — Adequação a Embargos Ambientais
            </strong>
          </div>

          <p class="indice">
            {{ Math.round(indicePercentual) }}%
          </p>

          <small v-if="indiceHectares != null">
            {{ ha(indiceHectares) }} sob embargo
          </small>

          <div class="barra">
            <span
              :style="{
                width:
                  Math.max(
                    0,
                    Math.min(indicePercentual, 100),
                  ) + '%',
              }"
            />
          </div>
        </div>

        <div v-else class="card-indice">
          <strong>IAE ainda não calculado</strong>

          <p>
            <small>
              O resultado aparece aqui assim que o processamento terminar.
            </small>
          </p>
        </div>

        <RouterLink class="botao" to="/imoveis">
          Ver outros imóveis
        </RouterLink>
      </aside>
    </main>
  </div>
</template>

<style scoped src="../assets/css/mapa.css"></style>
