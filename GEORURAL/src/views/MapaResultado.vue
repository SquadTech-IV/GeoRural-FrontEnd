<script setup>
import { ref, computed, watch, shallowRef, onMounted } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {LMap,LTileLayer,LGeoJson,LControlScale,} from '@vue-leaflet/vue-leaflet'
import BarraNavegacao from '../components/BarraNavegacao.vue'
import { imovelService } from '../services/imovelService'

const props = defineProps({
  car: { type: String, required: true },
  resultado: { type: Object, default: null },
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
  { chave: 'limite', rotulo: 'Limite do imóvel', cor: '#b400ff' },
  { chave: 'embargos', rotulo: 'Embargos', cor: '#ff4d6d' },
]

const visiveis = ref(
  Object.fromEntries(camadasUi.map((camada) => [camada.chave, true])),
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

const TIPOS_GEOJSON = [
  'Feature',
  'FeatureCollection',
  'GeometryCollection',
  'Polygon',
  'MultiPolygon',
]

onMounted(carregarImovel)
watch(() => props.car, carregarImovel)

function lerGeoJson(valor) {
  if (!valor) return null

  let geojson = valor
  if (typeof valor === 'string') {
    try {
      geojson = JSON.parse(valor)
    } catch {
      return null
    }
  }

  if (!geojson || !TIPOS_GEOJSON.includes(geojson.type)) return null

  if (geojson.type === 'FeatureCollection' && !geojson.features?.length) {
    return null
  }

  return geojson
}

async function carregarImovel() {
  carregando.value = true
  erro.value = ''
  dados.value = null
  mapa.value = null
  centro.value = null

  try {
    const feature = props.resultado ?? (await buscarNoBackend())
    const propriedades = feature.properties ?? {}
    const geometria = lerGeoJson(feature.geometry)

    dados.value = {
      car: propriedades.codigoCar ?? props.car,
      areaTotalHa: propriedades.areaTotal,
      municipio: propriedades.municipio,

      limite: geometria
        ? { type: 'Feature', geometry: geometria, properties: {} }
        : null,

      embargos: lerGeoJson(feature.embargos ?? propriedades.embargos),
      iae: propriedades.iae,
    }
  } catch (e) {
    erro.value =
      e.message ||
      'Não foi possível carregar os dados do imóvel. Tente novamente.'
  } finally {
    carregando.value = false
  }
}

async function buscarNoBackend() {
  try {
    return await imovelService.detalhe(props.car)
  } catch (e) {
    if (e.response?.status === 404) {
      throw new Error('Nenhum imóvel encontrado para esse CAR.', {
        cause: e,
      })
    }
    throw new Error(
      'Não foi possível carregar os dados do imóvel. Tente novamente.',
      { cause: e },
    )
  }
}

function limitesDoImovel(limite) {
  if (!limite) return null
  const b = L.geoJSON(limite).getBounds()
  if (!b.isValid()) return null
  const caixa = [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()]
  if (!caixa.every(Number.isFinite)) return null
  return [
    [caixa[0], caixa[1]],
    [caixa[2], caixa[3]],
  ]
}


const VISTA_PADRAO = { centro: [-15.2, -51.9], zoom: 4 }

function atualizarCentro() {
  if (mapa.value) centro.value = mapa.value.getCenter()
}

watch([mapa, dados], ([mapaAtual, dadosAtuais]) => {
  if (!mapaAtual || !dadosAtuais) return

  const bounds = limitesDoImovel(dadosAtuais.limite)
  if (bounds) {
    mapaAtual.fitBounds(bounds, { padding: [60, 60] })
  } else {
    mapaAtual.setView(VISTA_PADRAO.centro, VISTA_PADRAO.zoom)
  }

  atualizarCentro()
  mapaAtual.off('moveend', atualizarCentro)
  mapaAtual.on('moveend', atualizarCentro)
})

function centralizar() {
  const bounds = limitesDoImovel(dados.value?.limite)
  if (bounds) mapa.value?.fitBounds(bounds, { padding: [60, 60] })
}

const temIae = computed(() => !!dados.value?.iae)

const indicePercentual = computed(
  () => dados.value?.iae?.valorPercentual ?? 0,
)

const indiceHectares = computed(
  () => dados.value?.iae?.valorHectares ?? null,
)

const ha = (valor) =>
  valor != null
    ? `${Number(valor).toLocaleString('pt-BR', {
        maximumFractionDigits: 2,
      })} ha`
    : '—'

const dms = (valor, positivo, negativo) =>
  `${Math.floor(Math.abs(valor))}°${String(
    Math.floor((Math.abs(valor) - Math.floor(Math.abs(valor))) * 60),
  ).padStart(2, '0')}'${valor >= 0 ? positivo : negativo}`

const coordenadas = computed(() =>
  centro.value
    ? `Lat ${dms(centro.value.lat, 'N', 'S')} · Lon ${dms(
        centro.value.lng,
        'E',
        'W',
      )}`
    : '',
)
</script>

<template>
  <BarraNavegacao />

  <div class="tela">
    <main v-if="carregando" class="estado">
      Carregando dados do imóvel…
    </main>

    <main v-else-if="erro" class="estado erro">
      {{ erro }}
    </main>

    <main v-else-if="dados" class="corpo">
      <section class="mapa-painel">
        <LMap
          :key="car"
          class="mapa"
          :use-global-leaflet="false"
          :options="{
            zoomControl: false,
            attributionControl: false,
          }"
          @ready="(mapaPronto) => (mapa = mapaPronto)"
        >
          <LTileLayer
            :url="ESRI_TILE_URL"
            :attribution="ESRI_ATTRIBUTION"
            layer-type="base"
          />

          <template v-for="camada in camadasUi" :key="camada.chave">
            <LGeoJson
              v-if="visiveis[camada.chave] && dados[camada.chave]"
              :geojson="dados[camada.chave]"
              :options-style="estilos[camada.chave]"
            />
          </template>

          <LControlScale position="bottomright" :imperial="false" />
        </LMap>

        <div class="camadas">
          <span class="rotulo">Camadas</span>

          <label
            v-for="camada in camadasUi"
            :key="camada.chave"
            :class="{ apagada: !visiveis[camada.chave] }"
          >
            <input v-model="visiveis[camada.chave]" type="checkbox" />

            <span class="quadro" />

            {{ camada.rotulo }}

            <i class="ponto" :style="{ background: camada.cor }" />
          </label>
        </div>

        <div class="zoom">
          <button aria-label="Aproximar" @click="mapa?.zoomIn()">+</button>

          <button aria-label="Afastar" @click="mapa?.zoomOut()">−</button>

          <button aria-label="Centralizar" @click="centralizar">○</button>
        </div>

        <div class="coord">
          {{ coordenadas }}
        </div>
      </section>

      <aside class="lateral">
        <div class="cartao">
          <div class="linha-topo">
            <div>
              <small>Imóvel analisado</small>
              <h1>{{ dados.car }}</h1>
            </div>

            <span v-if="!temIae" class="status pendente">
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
            <strong>IAE — Adequação a Embargos Ambientais</strong>
          </div>

          <p class="indice">{{ Math.round(indicePercentual) }}%</p>

          <small v-if="indiceHectares != null">
            {{ ha(indiceHectares) }} sob embargo
          </small>

          <div class="barra">
            <span
              :style="{ width: Math.min(indicePercentual, 100) + '%' }"
            />
          </div>
        </div>

        <div v-else class="card-indice">
          <strong>IAE ainda não calculado</strong>

          <small>
            O resultado aparece aqui assim que o processamento terminar.
          </small>
        </div>

        <RouterLink class="botao" to="/imoveis">
          Ver outros imóveis
        </RouterLink>
      </aside>
    </main>
  </div>
</template>

<style scoped>
.tela {
  --fundo: #050507;
  --painel: #0b0b10;
  --borda: #1c1c26;
  --texto: #f2f0f7;
  --suave: #8a8798;
  --roxo: #b400ff;
  --verde: #19e6a0;
  --vermelho: #ff4d6d;

  min-height: 100vh;
  background: var(--fundo);
  color: var(--texto);
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
}

small {
  color: var(--suave);
  font-size: 11px;
}

.estado {
  padding: 48px 24px;
  text-align: center;
  color: var(--suave);
}

.estado.erro {
  color: var(--vermelho);
}

.corpo {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 16px;
  padding: 16px 24px;
}

.mapa-painel {
  position: relative;
  height: calc(100vh - 100px);
  min-height: 480px;
  border: 1px solid var(--borda);
  border-radius: 20px;
  overflow: hidden;
  background: var(--painel);
}

.mapa {
  height: 100%;
  background: #000;
}

.camadas,
.zoom,
.coord {
  position: absolute;
  z-index: 500;
  background: rgba(11, 11, 16, 0.92);
  border: 1px solid var(--borda);
  border-radius: 14px;
}

.camadas {
  top: 16px;
  left: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  min-width: 190px;
}

.camadas label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 12px;
}

.camadas label.apagada {
  color: var(--suave);
}

.camadas input {
  position: absolute;
  opacity: 0;
}

.quadro {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  background: var(--roxo);
}

.apagada .quadro {
  background: #fff;
  opacity: 0.6;
}

.ponto {
  width: 8px;
  height: 8px;
  margin-left: auto;
  border-radius: 50%;
}

.zoom {
  top: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.zoom button {
  width: 36px;
  height: 36px;
  border: 0;
  border-bottom: 1px solid var(--borda);
  background: none;
  color: var(--texto);
  font-size: 16px;
  cursor: pointer;
}

.zoom button:last-child {
  border-bottom: 0;
}

.coord {
  left: 16px;
  bottom: 16px;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 11px;
  color: var(--suave);
}
.lateral {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.cartao,
.card-indice {
  padding: 18px;
  background: var(--painel);
  border: 1px solid var(--borda);
  border-radius: 20px;
}

.linha-topo {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

h1 {
  margin: 4px 0;
  font-size: 20px;
  overflow-wrap: anywhere;
}

.status {
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 11px;
  border: 1px solid;
}

.status.pendente {
  color: #facc15;
  border-color: #6b5610;
  background: #1a1608;
}

.dados {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin: 18px 0 0;
  padding-top: 16px;
  border-top: 1px solid var(--borda);
}

.dados dt {
  color: var(--suave);
  font-size: 10px;
}

.dados dd {
  margin: 4px 0 0;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.indice {
  margin: 14px 0 0;
  font-size: 48px;
  font-weight: 700;
  color: var(--roxo);
  line-height: 1;
}

.barra {
  height: 8px;
  margin-top: 18px;
  background: #16161f;
  border-radius: 999px;
  overflow: hidden;
}

.barra span {
  display: block;
  height: 100%;
  background: var(--roxo);
  border-radius: 999px;
}

.botao {
  display: block;
  box-sizing: border-box;
  width: 100%;
  padding: 16px;
  border: 0;
  border-radius: 16px;
  background: var(--roxo);
  color: #fff;
  font: inherit;
  font-weight: 600;
  text-align: center;
  text-decoration: none;
  cursor: pointer;
}

@media (max-width: 900px) {
  .corpo {
    grid-template-columns: 1fr;
  }

  .mapa-painel {
    height: 60vh;
  }
}
</style>
