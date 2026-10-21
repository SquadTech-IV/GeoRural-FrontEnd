function converterNumero(valor) {
  const numero = Number(valor)

  if (!Number.isFinite(numero)) {
    throw new Error('Informe um valor válido para a câmera.')
  }

  return numero
}

function normalizarRotacao(valor) {
  const numero = converterNumero(valor)

  return ((numero + 180) % 360 + 360) % 360 - 180
}

function duracaoAnimacao() {
  const movimentoReduzido =
    typeof globalThis.matchMedia === 'function' &&
    globalThis.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

  return movimentoReduzido ? 0 : 500
}

export function criarControleCamera(
  mapa,
  { aoAlterar = () => {} } = {},
) {
  if (!mapa) {
    throw new Error('O mapa não está disponível.')
  }

  let destruido = false

  function obterEstado() {
    return {
      rotacao: Math.round(
        normalizarRotacao(mapa.getBearing()),
      ),
      inclinacao: Math.round(mapa.getPitch()),
      inclinacaoMinima: mapa.getMinPitch(),
      inclinacaoMaxima: Math.min(
        60,
        mapa.getMaxPitch(),
      ),
    }
  }

  function sincronizar() {
    if (destruido) return

    aoAlterar(obterEstado())
  }

  function definirRotacao(valor) {
    if (destruido) return

    mapa.stop()
    mapa.setBearing(normalizarRotacao(valor))
  }

  function definirInclinacao(valor) {
    if (destruido) return

    const numero = converterNumero(valor)
    const minimo = mapa.getMinPitch()
    const maximo = Math.min(60, mapa.getMaxPitch())

    const inclinacao = Math.min(
      maximo,
      Math.max(minimo, numero),
    )

    mapa.stop()
    mapa.setPitch(inclinacao)
  }

  function apontarNorte() {
    if (destruido) return

    mapa.stop()

    mapa.easeTo({
      bearing: 0,
      duration: duracaoAnimacao(),
    })
  }

  function vistaSuperior() {
    if (destruido) return

    mapa.stop()

    mapa.easeTo({
      bearing: 0,
      pitch: 0,
      duration: duracaoAnimacao(),
    })
  }

  function destruir() {
    if (destruido) return

    destruido = true

    mapa.off('rotate', sincronizar)
    mapa.off('pitch', sincronizar)
    mapa.off('moveend', sincronizar)
    mapa.off('remove', destruir)
  }

  mapa.on('rotate', sincronizar)
  mapa.on('pitch', sincronizar)
  mapa.on('moveend', sincronizar)
  mapa.on('remove', destruir)

  sincronizar()

  return {
    definirRotacao,
    definirInclinacao,
    apontarNorte,
    vistaSuperior,
    destruir,
  }
}
