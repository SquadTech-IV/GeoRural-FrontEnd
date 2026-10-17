import { sincronizarSombreamento } from './baseMapaService'

const SOURCE_TERRENO = 'terreno-dem'
const SOURCE_SOMBREAMENTO = 'terreno-sombreamento'
const LAYER_SOMBREAMENTO = 'camada-sombreamento'

function duracaoAnimacao(animar) {
  if (!animar) return 0

  const movimentoReduzido = globalThis.matchMedia?.(
    '(prefers-reduced-motion: reduce)',
  ).matches

  return movimentoReduzido ? 0 : 600
}

export function criarControleTerreno(mapa) {
  if (!mapa) {
    throw new Error('O mapa precisa estar disponível para configurar o relevo.')
  }

  let destruido = false
  let fonteCriada = false
  let camadaCriada = false

  function prepararSombreamento() {
    const estilo = mapa.getStyle()
    const fonteTerreno = estilo.sources?.[SOURCE_TERRENO]

    if (!fonteTerreno || fonteTerreno.type !== 'raster-dem') {
      throw new Error('A fonte DEM do relevo não está disponível no mapa.')
    }

    if (!mapa.getSource(SOURCE_SOMBREAMENTO)) {
      mapa.addSource(SOURCE_SOMBREAMENTO, {
        ...fonteTerreno,
      })

      fonteCriada = true
    }

    if (!mapa.getLayer(LAYER_SOMBREAMENTO)) {
      const primeiraCamadaDados = estilo.layers?.find(
        (camada) =>
          camada.source === 'dados-geojson' ||
          camada.id.startsWith('indicador-'),
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
        primeiraCamadaDados?.id,
      )

      camadaCriada = true
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

    sincronizarSombreamento(mapa)

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

    if (camadaCriada && mapa.getLayer(LAYER_SOMBREAMENTO)) {
      mapa.removeLayer(LAYER_SOMBREAMENTO)
    }

    if (fonteCriada && mapa.getSource(SOURCE_SOMBREAMENTO)) {
      mapa.removeSource(SOURCE_SOMBREAMENTO)
    }
  }

  return {
    definirAtivo,
    destruir,
  }
}
