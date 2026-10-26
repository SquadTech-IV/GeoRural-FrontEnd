import api from './api'
import { normalizarGeoJson } from './mapaRenderizacaoService'
import { prepararCamadasIndicadores } from './camadasIndicadoresService'

const numeros = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
})

function colecao(valor) {
  const dado = normalizarGeoJson(valor)

  return dado.type === 'FeatureCollection'
    ? dado
    : {
        type: 'FeatureCollection',
        features: [dado],
      }
}

export function normalizarImovel(dado) {
  if (
    !dado ||
    typeof dado.codigoCar !== 'string' ||
    !dado.codigoCar.trim()
  ) {
    throw new Error('A API retornou um imóvel sem código CAR.')
  }

  if (!Array.isArray(dado.indicadores)) {
    throw new Error(
      'A API retornou uma lista de indicadores inválida.',
    )
  }

  const siglas = new Set()

  const indicadores = dado.indicadores.map((indicador) => {
    const sigla = indicador?.sigla?.trim()

    if (!sigla || siglas.has(sigla.toUpperCase())) {
      throw new Error(
        'A API retornou indicadores com siglas ausentes ou repetidas.',
      )
    }

    siglas.add(sigla.toUpperCase())

    return {
      ...indicador,
      id: sigla,
      sigla,
      nome: indicador.nome || sigla,
      geojson: colecao(indicador.features),
    }
  })

  const geometria = colecao(dado.geometria)

  return {
    id: dado.id,
    codigoCar: dado.codigoCar.trim(),
    municipio: dado.municipio ?? null,
    areaTotal: dado.areaTotal ?? null,
    geojson: {
      type: 'FeatureCollection',
      features: geometria.features.map((feature) => ({
        ...feature,
        properties: {
          ...feature.properties,
          imovelId: dado.id,
          codigoCar: dado.codigoCar.trim(),
          municipio: dado.municipio ?? null,
          areaTotal: dado.areaTotal ?? null,
        },
      })),
    },
    indicadores,
  }
}

export function criarVisaoGeral(imoveis) {
  return {
    type: 'FeatureCollection',
    features: imoveis.flatMap(
      (imovel) => imovel.geojson.features,
    ),
  }
}

export function criarCamadas(imovel) {
  return prepararCamadasIndicadores(
    imovel?.indicadores ?? [],
  )
}

export function formatarNumero(valor, unidade = '') {
  if (
    valor == null ||
    valor === '' ||
    !Number.isFinite(Number(valor))
  ) {
    return 'Não informado'
  }

  return (
    numeros.format(Number(valor)) +
    (unidade ? ` ${unidade}` : '')
  )
}

export function formatarResultado(indicador) {
  const valores = []

  if (indicador.valorPercentual != null) {
    valores.push(
      formatarNumero(indicador.valorPercentual, '%'),
    )
  }

  if (indicador.valorHectares != null) {
    valores.push(
      formatarNumero(indicador.valorHectares, 'ha'),
    )
  }

  if (indicador.valorAbsoluto != null) {
    valores.push(
      formatarNumero(
        indicador.valorAbsoluto,
        indicador.unidade,
      ),
    )
  }

  return valores.length
    ? valores.join(' · ')
    : 'Resultado não informado'
}

export function requisicaoCancelada(erro) {
  return (
    erro?.code === 'ERR_CANCELED' ||
    erro?.name === 'AbortError'
  )
}

export function obterMensagemErro(erro) {
  const status = erro?.response?.status

  if (status === 404) {
    return 'O imóvel ou o endpoint solicitado não foi encontrado.'
  }

  if (status === 401 || status === 403) {
    return 'Você não tem autorização para consultar esses dados.'
  }

  if (status >= 500) {
    return (
      'O servidor não conseguiu carregar os dados do mapa. ' +
      'Tente novamente.'
    )
  }

  if (erro?.code === 'ECONNABORTED') {
    return 'O servidor demorou para responder. Tente novamente.'
  }

  if (erro?.request && !erro.response) {
    return 'Não foi possível conectar ao backend.'
  }

  const mensagem =
    erro?.response?.data?.mensagem ||
    erro?.response?.data?.message

  return typeof mensagem === 'string' && mensagem.trim()
    ? mensagem
    : erro?.message ||
        'Não foi possível carregar os dados do mapa.'
}

export const mapaIndicadoresService = {
  async listarMapa({ signal } = {}) {
    const { data } = await api.get('/api/mapa', {
      signal,
    })

    if (!Array.isArray(data)) {
      throw new Error(
        'A API retornou uma listagem de imóveis inválida.',
      )
    }

    return data.map(normalizarImovel)
  },

  async buscarImovel(car, { signal } = {}) {
    if (typeof car !== 'string' || !car.trim()) {
      throw new Error('Informe o código CAR do imóvel.')
    }

    const codigoCar = car.trim()

    const { data } = await api.get(
      `/api/imoveis/${encodeURIComponent(codigoCar)}`,
      { signal },
    )

    const imovel = normalizarImovel(data)

    if (imovel.codigoCar !== codigoCar) {
      throw new Error(
        'A API retornou um imóvel diferente do solicitado.',
      )
    }

    return imovel
  },
}
