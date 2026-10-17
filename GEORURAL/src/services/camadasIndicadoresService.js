import { normalizarGeoJson } from './mapaRenderizacaoService'

const estilosIndicadores = {
  IAE: {
    nome: 'Área embargada',
    cor: '#ff4d6d',
  },
  IRL: {
    nome: 'Reserva Legal',
    cor: '#16a34a',
  },
  ICV: {
    nome: 'Cobertura vegetal nativa',
    cor: '#0891b2',
  },
  IAPP: {
    nome: 'APP conservada',
    cor: '#0ea5e9',
  },
  ISAP: {
    nome: 'Áreas protegidas',
    cor: '#b45309',
  },
  IDESMAT: {
    nome: 'Desmatamento',
    cor: '#ea580c',
  },
  IFC: {
    nome: 'Focos de calor',
    cor: '#ef4444',
  },
}

function possuiCoordenadas(coordenadas) {
  if (!Array.isArray(coordenadas) || !coordenadas.length) {
    return false
  }

  if (typeof coordenadas[0] === 'number') {
    return (
      Number.isFinite(coordenadas[0]) &&
      Number.isFinite(coordenadas[1])
    )
  }

  return coordenadas.some(possuiCoordenadas)
}

function possuiGeometria(geojson) {
  if (!geojson) return false

  if (geojson.type === 'FeatureCollection') {
    return geojson.features.some(possuiGeometria)
  }

  if (geojson.type === 'Feature') {
    return possuiGeometria(geojson.geometry)
  }

  if (geojson.type === 'GeometryCollection') {
    return geojson.geometries.some(possuiGeometria)
  }

  return possuiCoordenadas(geojson.coordinates)
}

export function prepararCamadasIndicadores(indicadores) {
  if (!Array.isArray(indicadores)) {
    throw new Error(
      'As camadas dos indicadores devem ser uma lista.',
    )
  }

  const identificadores = new Set()
  const camadas = []

  for (const indicador of indicadores) {
    if (!indicador || typeof indicador.sigla !== 'string') {
      throw new Error(
        'Cada camada deve informar a sigla do indicador.',
      )
    }

    const sigla = indicador.sigla.trim().toUpperCase()
    const id = String(indicador.id ?? sigla).trim()

    if (!sigla || !id) {
      throw new Error(
        'O identificador e a sigla da camada são obrigatórios.',
      )
    }

    if (identificadores.has(id)) {
      throw new Error(
        `Existe mais de uma camada com o identificador "${id}".`,
      )
    }

    identificadores.add(id)

    const geojson = normalizarGeoJson(indicador.geojson)

    if (!possuiGeometria(geojson)) {
      continue
    }

    const estilo = estilosIndicadores[sigla] ?? {
      nome: sigla,
      cor: '#8520bd',
    }

    camadas.push({
      id,
      sigla,
      nome: indicador.nome || estilo.nome,
      cor: estilo.cor,
      geojson,
    })
  }

  return camadas
}

function identificadoresCamada(id) {
  const prefixo = `indicador-${encodeURIComponent(id)}`

  return {
    source: `${prefixo}-source`,
    preenchimento: `${prefixo}-preenchimento`,
    contorno: `${prefixo}-contorno`,
    pontos: `${prefixo}-pontos`,
  }
}

function adicionarCamada(mapa, camada) {
  const ids = identificadoresCamada(camada.id)

  mapa.addSource(ids.source, {
    type: 'geojson',
    data: camada.geojson,
  })

  mapa.addLayer({
    id: ids.preenchimento,
    type: 'fill',
    source: ids.source,
    filter: [
      '==',
      ['geometry-type'],
      'Polygon',
    ],
    paint: {
      'fill-color': camada.cor,
      'fill-opacity': 0.35,
    },
  })

  mapa.addLayer({
    id: ids.contorno,
    type: 'line',
    source: ids.source,
    filter: [
      'in',
      ['geometry-type'],
      ['literal', ['Polygon', 'LineString']],
    ],
    paint: {
      'line-color': camada.cor,
      'line-width': 2,
    },
  })

  mapa.addLayer({
    id: ids.pontos,
    type: 'circle',
    source: ids.source,
    filter: [
      '==',
      ['geometry-type'],
      'Point',
    ],
    paint: {
      'circle-color': camada.cor,
      'circle-radius': 6,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 1.5,
    },
  })
}

function removerCamada(mapa, id) {
  const ids = identificadoresCamada(id)

  for (const layerId of [
    ids.pontos,
    ids.contorno,
    ids.preenchimento,
  ]) {
    if (mapa.getLayer(layerId)) {
      mapa.removeLayer(layerId)
    }
  }

  if (mapa.getSource(ids.source)) {
    mapa.removeSource(ids.source)
  }
}

export function criarControleCamadas(mapa) {
  const cadastradas = new Set()

  function atualizar(indicadores) {
    const camadas = prepararCamadasIndicadores(indicadores)

    const idsRecebidos = new Set(
      camadas.map((camada) => camada.id),
    )

    for (const id of [...cadastradas]) {
      if (!idsRecebidos.has(id)) {
        removerCamada(mapa, id)
        cadastradas.delete(id)
      }
    }

    for (const camada of camadas) {
      const ids = identificadoresCamada(camada.id)
      const source = mapa.getSource(ids.source)

      if (source) {
        source.setData(camada.geojson)

        mapa.setPaintProperty(
          ids.preenchimento,
          'fill-color',
          camada.cor,
        )

        mapa.setPaintProperty(
          ids.contorno,
          'line-color',
          camada.cor,
        )

        mapa.setPaintProperty(
          ids.pontos,
          'circle-color',
          camada.cor,
        )
      } else {
        adicionarCamada(mapa, camada)
      }

      cadastradas.add(camada.id)
    }

    if (mapa.getLayer('geojson-preenchimento')) {
      mapa.setPaintProperty(
        'geojson-preenchimento',
        'fill-opacity',
        0.03,
      )
    }

    if (mapa.getLayer('geojson-contorno')) {
      mapa.moveLayer('geojson-contorno')
    }

    return camadas.map((camada) => ({
      id: camada.id,
      nome: camada.nome,
      cor: camada.cor,
    }))
  }

  function limpar() {
    for (const id of cadastradas) {
      removerCamada(mapa, id)
    }

    cadastradas.clear()
  }

  return {
    atualizar,
    limpar,
  }
}
