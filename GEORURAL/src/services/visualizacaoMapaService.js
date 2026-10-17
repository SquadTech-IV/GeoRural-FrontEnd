import intersect from '@turf/intersect'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { normalizarGeoJson } from './mapaRenderizacaoService'
import {
  prepararCamadasIndicadores,
} from './camadasIndicadoresService'

export const modosVisualizacao = [
  {
    id: 'soimovel',
    nome: 'Só imóvel',
  },
  {
    id: 'completo',
    nome: 'Imóvel + camadas',
  },
  {
    id: 'interseccao',
    nome: 'Só interseção',
  },
]

function criarFeature(geometry, properties = {}) {
  return {
    type: 'Feature',
    properties,
    geometry,
  }
}

function extrairFeatures(geojson, properties = {}) {
  if (!geojson) return []

  if (geojson.type === 'FeatureCollection') {
    return geojson.features.flatMap(
      (feature) => extrairFeatures(feature),
    )
  }

  if (geojson.type === 'Feature') {
    return extrairFeatures(
      geojson.geometry,
      geojson.properties ?? {},
    )
  }

  if (geojson.type === 'GeometryCollection') {
    return geojson.geometries.flatMap(
      (geometry) => extrairFeatures(geometry, properties),
    )
  }

  if (geojson.type === 'MultiPoint') {
    return geojson.coordinates.map((coordinates) =>
      criarFeature(
        {
          type: 'Point',
          coordinates,
        },
        properties,
      ),
    )
  }

  return [criarFeature(geojson, properties)]
}

function obterPoligonosImovel(limite) {
  return extrairFeatures(normalizarGeoJson(limite))
    .filter((feature) =>
      ['Polygon', 'MultiPolygon']
        .includes(feature.geometry.type),
    )
}

function recortarCamada(geojson, poligonosImovel) {
  const resultado = []

  for (const feature of extrairFeatures(geojson)) {
    const tipo = feature.geometry.type

    if (tipo === 'Point') {
      const dentroDoImovel = poligonosImovel.some(
        (imovel) => booleanPointInPolygon(feature, imovel),
      )

      if (dentroDoImovel) {
        resultado.push(feature)
      }

      continue
    }

    if (tipo === 'Polygon' || tipo === 'MultiPolygon') {
      for (const imovel of poligonosImovel) {
        const recorte = intersect(
          {
            type: 'FeatureCollection',
            features: [imovel, feature],
          },
          {
            properties: feature.properties ?? {},
          },
        )

        if (recorte) {
          resultado.push(recorte)
        }
      }

      continue
    }

    throw new Error(
      'O modo de interseção suporta polígonos e pontos. ' +
      'Esta camada contém uma geometria de linha.',
    )
  }

  return {
    type: 'FeatureCollection',
    features: resultado,
  }
}

export function prepararVisualizacao({
  limite,
  indicadores,
  modo,
}) {
  if (!modosVisualizacao.some((item) => item.id === modo)) {
    throw new Error('Modo de visualização inválido.')
  }

  const poligonosImovel = obterPoligonosImovel(limite)
  const possuiImovel = poligonosImovel.length > 0

  if (modo === 'soimovel') {
    return {
      indicadores: [],
      mostrarImovel: true,
      possuiImovel,
      mensagem: possuiImovel
        ? ''
        : 'A geometria do imóvel não está disponível.',
    }
  }

  const camadas = prepararCamadasIndicadores(indicadores)

  if (modo === 'completo') {
    return {
      indicadores: camadas,
      mostrarImovel: true,
      possuiImovel,
      mensagem: '',
    }
  }

  if (!possuiImovel) {
    throw new Error(
      'A geometria do imóvel é necessária para calcular a interseção.',
    )
  }

  const recortadas = camadas
    .map((camada) => ({
      ...camada,
      geojson: recortarCamada(
        camada.geojson,
        poligonosImovel,
      ),
    }))
    .filter((camada) => camada.geojson.features.length > 0)

  return {
    indicadores: recortadas,
    mostrarImovel: false,
    possuiImovel,
    mensagem: recortadas.length
      ? ''
      : 'Nenhuma interseção encontrada nas camadas recebidas.',
  }
}

export function aplicarVisibilidadeImovel(mapa, mostrar) {
  const visibilidade = mostrar ? 'visible' : 'none'

  for (const id of [
    'geojson-preenchimento',
    'geojson-contorno',
    'geojson-pontos',
  ]) {
    if (mapa.getLayer(id)) {
      mapa.setLayoutProperty(
        id,
        'visibility',
        visibilidade,
      )
    }
  }
}
