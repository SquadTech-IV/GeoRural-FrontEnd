import {
  Map,
  NavigationControl,
  ScaleControl,
  LngLatBounds,
  setWorkerUrl,
} from 'maplibre-gl'

import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

import 'maplibre-gl/dist/maplibre-gl.css'

setWorkerUrl(workerUrl)

function colecaoVazia() {
  return {
    type: 'FeatureCollection',
    features: [],
  }
}

function normalizarGeometria(valor) {
  if (!valor) return null

  const geometria = typeof valor === 'string'
    ? JSON.parse(valor)
    : valor

  const tipos = [
    'Point',
    'MultiPoint',
    'LineString',
    'MultiLineString',
    'Polygon',
    'MultiPolygon',
    'GeometryCollection',
  ]

  if (!tipos.includes(geometria.type)) {
    throw new Error('Tipo de geometria não suportado.')
  }

  if (geometria.type === 'GeometryCollection') {
    if (!Array.isArray(geometria.geometries)) {
      throw new Error('Coleção de geometrias inválida.')
    }

    return {
      ...geometria,
      geometries: geometria.geometries
        .map(normalizarGeometria)
        .filter(Boolean),
    }
  }

  if (!Array.isArray(geometria.coordinates)) {
    throw new Error('Coordenadas da geometria inválidas.')
  }

  return geometria
}

export function normalizarGeoJson(valor) {
  if (valor == null || valor === '') {
    return colecaoVazia()
  }

  const geojson = typeof valor === 'string'
    ? JSON.parse(valor)
    : valor

  if (!geojson || typeof geojson !== 'object') {
    throw new Error('O GeoJSON recebido é inválido.')
  }

  if (geojson.type === 'FeatureCollection') {
    if (!Array.isArray(geojson.features)) {
      throw new Error('A coleção GeoJSON não possui uma lista de features.')
    }

    return {
      ...geojson,
      features: geojson.features.map((feature) => {
        if (feature?.type !== 'Feature') {
          throw new Error('A coleção contém uma feature inválida.')
        }

        return normalizarGeoJson(feature)
      }),
    }
  }

  if (geojson.type === 'Feature') {
    return {
      ...geojson,
      properties: geojson.properties ?? {},
      geometry: normalizarGeometria(geojson.geometry),
    }
  }

  return {
    type: 'Feature',
    properties: {},
    geometry: normalizarGeometria(geojson),
  }
}

function percorrerCoordenadas(coordenadas, visitar) {
  if (!Array.isArray(coordenadas) || !coordenadas.length) {
    return
  }

  if (typeof coordenadas[0] === 'number') {
    const [longitude, latitude] = coordenadas

    if (
      !Number.isFinite(longitude) ||
      !Number.isFinite(latitude) ||
      longitude < -180 ||
      longitude > 180 ||
      latitude < -90 ||
      latitude > 90
    ) {
      throw new Error(
        'O GeoJSON deve possuir coordenadas válidas em longitude e latitude.',
      )
    }

    visitar([longitude, latitude])
    return
  }

  for (const coordenada of coordenadas) {
    percorrerCoordenadas(coordenada, visitar)
  }
}

function percorrerGeoJson(geojson, visitar) {
  if (!geojson) return

  if (geojson.type === 'FeatureCollection') {
    geojson.features.forEach(
      (feature) => percorrerGeoJson(feature, visitar),
    )
    return
  }

  if (geojson.type === 'Feature') {
    percorrerGeoJson(geojson.geometry, visitar)
    return
  }

  if (geojson.type === 'GeometryCollection') {
    geojson.geometries.forEach(
      (geometria) => percorrerGeoJson(geometria, visitar),
    )
    return
  }

  percorrerCoordenadas(geojson.coordinates, visitar)
}

function calcularLimites(geojson) {
  const limites = new LngLatBounds()

  percorrerGeoJson(geojson, (coordenada) => {
    limites.extend(coordenada)
  })

  return limites
}

export function criarEstiloMapa() {
  return {
    version: 8,

    sources: {
      'base-ruas': {
        type: 'raster',
        tiles: [
          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        ],
        tileSize: 256,
        maxzoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" ' +
          'target="_blank" rel="noopener noreferrer">' +
          'OpenStreetMap</a> contributors',
      },

      'base-satelite': {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/' +
          'World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        maxzoom: 19,
        attribution:
          'Source: Esri, Vantor, Earthstar Geographics, ' +
          'and the GIS User Community',
      },

      'terreno-dem': {
        type: 'raster-dem',
        tiles: [
          'https://s3.amazonaws.com/elevation-tiles-prod/' +
          'terrarium/{z}/{x}/{y}.png',
        ],
        tileSize: 256,
        encoding: 'terrarium',
        maxzoom: 15,
        attribution:
          '<a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" ' +
          'target="_blank" rel="noopener noreferrer">' +
          'Mapzen Terrain Tiles</a>',
      },

      'dados-geojson': {
        type: 'geojson',
        data: colecaoVazia(),
      },
    },

    layers: [
      {
        id: 'fundo-mapa',
        type: 'background',
        paint: {
          'background-color': '#e9e6ee',
        },
      },
      {
        id: 'camada-ruas',
        type: 'raster',
        source: 'base-ruas',
        layout: {
          visibility: 'visible',
        },
      },
      {
        id: 'camada-satelite',
        type: 'raster',
        source: 'base-satelite',
        layout: {
          visibility: 'none',
        },
      },
      {
        id: 'geojson-preenchimento',
        type: 'fill',
        source: 'dados-geojson',
        filter: [
          '==',
          ['geometry-type'],
          'Polygon',
        ],
        paint: {
          'fill-color': '#b400ff',
          'fill-opacity': 0.15,
        },
      },
      {
        id: 'geojson-contorno',
        type: 'line',
        source: 'dados-geojson',
        filter: [
          'in',
          ['geometry-type'],
          ['literal', ['Polygon', 'LineString']],
        ],
        paint: {
          'line-color': '#b400ff',
          'line-width': 2,
        },
      },
      {
        id: 'geojson-pontos',
        type: 'circle',
        source: 'dados-geojson',
        filter: [
          '==',
          ['geometry-type'],
          'Point',
        ],
        paint: {
          'circle-color': '#b400ff',
          'circle-radius': 6,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      },
    ],
  }
}

export function criarMapa({
  container,
  geojson = null,
  aoCarregar = () => {},
  aoFalhar = () => {},
}) {
  if (!container) {
    throw new Error(
      'O elemento de renderização do mapa não foi encontrado.',
    )
  }

  let destruido = false
  let pronto = false
  let observador = null

  let dadosAtuais = normalizarGeoJson(geojson)
  let limitesAtuais = calcularLimites(dadosAtuais)

  const mapa = new Map({
    container,
    style: criarEstiloMapa(),
    center: [-51.5, -24.5],
    zoom: 6,
    minZoom: 2,
    maxZoom: 19,
    pitch: 0,
    bearing: 0,
    attributionControl: {
      compact: true,
    },
  })

  mapa.addControl(
    new NavigationControl({
      showZoom: true,
      showCompass: false,
    }),
    'top-left',
  )

  mapa.addControl(
    new ScaleControl({
      maxWidth: 120,
      unit: 'metric',
    }),
    'bottom-left',
  )

  function aplicarGeoJson(enquadrar = true) {
    if (destruido || !pronto) return

    const source = mapa.getSource('dados-geojson')

    if (!source) return

    source.setData(dadosAtuais)

    if (enquadrar && !limitesAtuais.isEmpty()) {
      mapa.fitBounds(limitesAtuais, {
        padding: 40,
        maxZoom: 17,
        duration: 0,
      })
    }
  }

  function atualizarGeoJson(valor, enquadrar = true) {
    if (destruido) return

    const dados = normalizarGeoJson(valor)
    const limites = calcularLimites(dados)

    dadosAtuais = dados
    limitesAtuais = limites

    aplicarGeoJson(enquadrar)
  }

  function tratarCarregamento() {
    if (destruido) return

    pronto = true
    mapa.resize()
    aplicarGeoJson()

    aoCarregar(mapa)
  }

  function tratarErro(evento) {
    if (destruido) return

    aoFalhar(
      new Error(
        'Não foi possível carregar os dados ou uma das fontes do mapa.',
        { cause: evento.error },
      ),
    )
  }

  mapa.on('load', tratarCarregamento)
  mapa.on('error', tratarErro)

  if (typeof ResizeObserver !== 'undefined') {
    observador = new ResizeObserver(() => {
      if (!destruido) {
        mapa.resize()
      }
    })

    observador.observe(container)
  }

  function destruir() {
    if (destruido) return

    destruido = true
    pronto = false

    observador?.disconnect()

    mapa.off('load', tratarCarregamento)
    mapa.off('error', tratarErro)

    mapa.remove()
  }

  return {
    mapa,
    atualizarGeoJson,
    destruir,
  }
}
