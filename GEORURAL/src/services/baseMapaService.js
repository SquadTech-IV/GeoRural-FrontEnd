export const basesMapa = [
  {
    id: 'ruas',
    nome: 'Ruas',
  },
  {
    id: 'satelite',
    nome: 'Satélite',
  },
  {
    id: 'relevo',
    nome: 'Relevo',
  },
]

const SOURCE_RELEVO = 'base-relevo-dem'
const LAYER_RELEVO_FUNDO = 'base-relevo-fundo'
const LAYER_RELEVO_SOMBRA = 'base-relevo-sombra'

const LAYER_SOMBREAMENTO_TERRENO = 'camada-sombreamento'

export function sincronizarSombreamento(mapa) {
  if (!mapa.getLayer(LAYER_SOMBREAMENTO_TERRENO)) {
    return
  }

  const baseRelevoVisivel =
    Boolean(mapa.getLayer(LAYER_RELEVO_SOMBRA)) &&
    mapa.getLayoutProperty(
      LAYER_RELEVO_SOMBRA,
      'visibility',
    ) === 'visible'

  const terrenoAtivo =
    mapa.getTerrain()?.source === 'terreno-dem'

  mapa.setLayoutProperty(
    LAYER_SOMBREAMENTO_TERRENO,
    'visibility',
    terrenoAtivo && !baseRelevoVisivel
      ? 'visible'
      : 'none',
  )
}

function prepararBaseRelevo(mapa) {
  const estilo = mapa.getStyle()
  const sourceDem = estilo.sources['terreno-dem']

  if (!sourceDem || sourceDem.type !== 'raster-dem') {
    throw new Error(
      'A fonte DEM necessária para a base de relevo não foi configurada.',
    )
  }

  if (!mapa.getSource(SOURCE_RELEVO)) {
    mapa.addSource(SOURCE_RELEVO, {
      ...sourceDem,
    })
  }

  const primeiraCamadaDeDados = estilo.layers.find(
    (layer) =>
      layer.id === LAYER_SOMBREAMENTO_TERRENO ||
      layer.source === 'dados-geojson' ||
      layer.id.startsWith('indicador-'),
  )

  if (!mapa.getLayer(LAYER_RELEVO_FUNDO)) {
    mapa.addLayer(
      {
        id: LAYER_RELEVO_FUNDO,
        type: 'background',
        layout: {
          visibility: 'none',
        },
        paint: {
          'background-color': '#e9e5dc',
        },
      },
      primeiraCamadaDeDados?.id,
    )
  }

  if (!mapa.getLayer(LAYER_RELEVO_SOMBRA)) {
    mapa.addLayer(
      {
        id: LAYER_RELEVO_SOMBRA,
        type: 'hillshade',
        source: SOURCE_RELEVO,
        layout: {
          visibility: 'none',
        },
        paint: {
          'hillshade-exaggeration': 0.45,
          'hillshade-shadow-color': '#5b5146',
          'hillshade-highlight-color': '#fffdf6',
          'hillshade-accent-color': '#a79a87',
          'hillshade-illumination-direction': 315,
        },
      },
      primeiraCamadaDeDados?.id,
    )
  }
}

export function criarControleBase(mapa) {
  if (!mapa) {
    throw new Error('O mapa não está disponível.')
  }

  for (const id of ['camada-ruas', 'camada-satelite']) {
    if (!mapa.getLayer(id)) {
      throw new Error(
        `A camada de base "${id}" não foi configurada.`,
      )
    }
  }

  prepararBaseRelevo(mapa)

  function alterarBase(base) {
    if (!basesMapa.some((item) => item.id === base)) {
      throw new Error('Selecione uma base de mapa válida.')
    }

    const visibilidades = {
      'camada-ruas': base === 'ruas',
      'camada-satelite': base === 'satelite',
      [LAYER_RELEVO_FUNDO]: base === 'relevo',
      [LAYER_RELEVO_SOMBRA]: base === 'relevo',
    }

    for (const [id, visivel] of Object.entries(visibilidades)) {
      mapa.setLayoutProperty(
        id,
        'visibility',
        visivel ? 'visible' : 'none',
      )
    }

    sincronizarSombreamento(mapa)
  }

  return {
    alterarBase,
  }
}
