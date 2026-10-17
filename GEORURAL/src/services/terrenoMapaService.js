const SOURCE_TERRENO = 'terreno-dem'
const SOURCE_SOMBREAMENTO = 'terreno-sombreamento'
const LAYER_SOMBREAMENTO = 'camada-sombreamento'

function duracaoAnimacao(animar) {
  if (!animar) return 0

  const movimentoReduzido =
    typeof globalThis.matchMedia === 'function' &&
    globalThis.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

  return movimentoReduzido ? 0 : 600
}

export function criarControleTerreno(mapa) {
  let destruido = false
  let sourceCriada = false
  let layerCriada = false

  function prepararSombreamento() {
    const estilo = mapa.getStyle()
    const sourceTerreno = estilo.sources[SOURCE_TERRENO]

    if (!sourceTerreno || sourceTerreno.type !== 'raster-dem') {
      throw new Error(
        'A fonte DEM do terreno não foi configurada no mapa.',
      )
    }

    if (!mapa.getSource(SOURCE_SOMBREAMENTO)) {
      mapa.addSource(SOURCE_SOMBREAMENTO, {
        ...sourceTerreno,
      })

      sourceCriada = true
    }

    if (!mapa.getLayer(LAYER_SOMBREAMENTO)) {
      const primeiraCamadaDeDados = estilo.layers.find(
        (layer) =>
          layer.source === 'dados-geojson' ||
          layer.id.startsWith('indicador-'),
      )

      mapa.addLayer(
        {
          id: LAYER_SOMBREAMENTO,
          type: 'hillshade',
          source: SOURCE_SOMBREAMENTO,
          layout: {
            visibility: 'none',
          },
          paint: {
            'hillshade-exaggeration': 0.35,
            'hillshade-shadow-color': '#51475d',
            'hillshade-highlight-color': '#ffffff',
            'hillshade-accent-color': '#877d91',
            'hillshade-illumination-direction': 315,
          },
        },
        primeiraCamadaDeDados?.id,
      )

      layerCriada = true
    }
  }

  function definirAtivo(ativo, { animar = true } = {}) {
    if (destruido) return

    if (ativo) {
      prepararSombreamento()

      mapa.setTerrain({
        source: SOURCE_TERRENO,
        exaggeration: 1,
      })

      mapa.setLayoutProperty(
        LAYER_SOMBREAMENTO,
        'visibility',
        'visible',
      )
    } else {
      mapa.setTerrain(null)

      if (mapa.getLayer(LAYER_SOMBREAMENTO)) {
        mapa.setLayoutProperty(
          LAYER_SOMBREAMENTO,
          'visibility',
          'none',
        )
      }
    }

    mapa.easeTo({
      pitch: ativo ? 45 : 0,
      duration: duracaoAnimacao(animar),
    })
  }

  function destruir() {
    if (destruido) return

    destruido = true

    if (mapa.getTerrain()?.source === SOURCE_TERRENO) {
      mapa.setTerrain(null)
    }

    if (
      layerCriada &&
      mapa.getLayer(LAYER_SOMBREAMENTO)
    ) {
      mapa.removeLayer(LAYER_SOMBREAMENTO)
    }

    if (
      sourceCriada &&
      mapa.getSource(SOURCE_SOMBREAMENTO)
    ) {
      mapa.removeSource(SOURCE_SOMBREAMENTO)
    }
  }

  return {
    definirAtivo,
    destruir,
  }
}
