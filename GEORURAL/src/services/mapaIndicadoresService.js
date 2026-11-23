import api from './api'
import { normalizarGeoJson } from './mapaRenderizacaoService'
import { prepararCamadasIndicadores, obterEstiloIndicador } from './camadasIndicadoresService'

const numeros = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
})

const situacoesIsap = {
  COM_SOBREPOSICAO: 'Com sobreposição',
  SEM_SOBREPOSICAO: 'Sem sobreposição',
  CAMADA_INDISPONIVEL: 'Camada indisponível',
}

export function apresentarSituacaoIndicador(indicador) {
  if (indicador.sigla === 'IDESMAT') {
    return (
      {
        COM_DESMATAMENTO: 'Com desmatamento',
        SEM_DESMATAMENTO: 'Sem desmatamento',
        COM_SUPRESSAO: 'Com supressão',
        SEM_SUPRESSAO: 'Sem supressão',
      }[indicador.situacao] ||
      indicador.situacao ||
      'Não informada'
    )
  }
  return indicador.sigla === 'ISAP'
    ? situacoesIsap[indicador.situacao] || indicador.situacao || 'Não informada'
    : indicador.situacao || 'Não informada'
}

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
  if (!dado || typeof dado.codigoCar !== 'string' || !dado.codigoCar.trim()) {
    throw new Error('A API retornou um imóvel sem código CAR.')
  }

  if (!Array.isArray(dado.indicadores)) {
    throw new Error('A API retornou uma lista de indicadores inválida.')
  }

  const siglas = new Set()

  const indicadores = dado.indicadores.map((indicador) => {
    const sigla = indicador?.sigla?.trim().toUpperCase()

    if (!sigla || siglas.has(sigla.toUpperCase())) {
      throw new Error('A API retornou indicadores com siglas ausentes ou repetidas.')
    }

    siglas.add(sigla.toUpperCase())

    return {
      ...indicador,
      id: sigla,
      sigla,
      nome: indicador.nome || obterEstiloIndicador(sigla).nome,
      geojson: colecao(indicador.features),
      situacaoTexto: apresentarSituacaoIndicador({ ...indicador, sigla }),
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
    features: imoveis.flatMap((imovel) => imovel.geojson.features),
  }
}

export function criarCamadas(imovel) {
  return prepararCamadasIndicadores(imovel?.indicadores ?? [])
}

export function criarResumosIndicadoresMapa(imovel) {
  if (!imovel) return []
  const camadas = criarCamadas(imovel)
  return imovel.indicadores
    .filter((indicador) => ['ISAP', 'IDESMAT'].includes(indicador.sigla))
    .map((indicador) => ({
      id: indicador.id,
      titulo: `${indicador.sigla} · ${indicador.nome}`,
      cor: obterEstiloIndicador(indicador.sigla).cor,
      situacao: apresentarSituacaoIndicador(indicador),
      valores: detalharResultado(indicador),
      mensagem: camadas.some((camada) => camada.id === indicador.id)
        ? ''
        : indicador.sigla === 'IDESMAT'
          ? ['SEM_DESMATAMENTO', 'SEM_SUPRESSAO'].includes(indicador.situacao)
            ? 'Sem desmatamento registrado no resultado vigente.'
            : 'Geometria do desmatamento indisponível no resultado do backend.'
          : 'Geometria da sobreposição indisponível.',
    }))
}

export function formatarNumero(valor, unidade = '') {
  if (valor == null || valor === '' || !Number.isFinite(Number(valor))) {
    return 'Não informado'
  }

  return numeros.format(Number(valor)) + (unidade ? ` ${unidade}` : '')
}

export function formatarResultado(indicador) {
  if (indicador.sigla?.trim().toUpperCase() === 'IDESMAT') {
    return (
      detalharResultado(indicador)
        .map((campo) => campo.valor)
        .join(' · ') || 'Resultado não informado'
    )
  }
  const valores = []

  if (indicador.valorPercentual != null) {
    valores.push(formatarNumero(indicador.valorPercentual, '%'))
  }

  if (indicador.valorHectares != null) {
    valores.push(formatarNumero(indicador.valorHectares, 'ha'))
  }

  if (indicador.valorAbsoluto != null) {
    // A unidade do indicador descreve o percentual, não o valor absoluto.
    const unidadeAbsoluta =
      indicador.unidade?.trim() === '%' ? '(valor absoluto)' : indicador.unidade

    valores.push(formatarNumero(indicador.valorAbsoluto, unidadeAbsoluta))
  }

  return valores.length ? valores.join(' · ') : 'Resultado não informado'
}

export function detalharResultado(indicador) {
  const campos = []
  if (indicador.sigla?.trim().toUpperCase() === 'IDESMAT') {
    if (indicador.valorPercentual != null) {
      campos.push({
        legenda: 'Percentual desmatado',
        valor: formatarNumero(indicador.valorPercentual) + '%',
      })
    }
    const area = indicador.valorHectares ?? indicador.valorAbsoluto
    if (area != null) {
      campos.push({ legenda: 'Área desmatada', valor: formatarNumero(area, 'ha') })
    }
    return campos
  }
  const coberturaVegetal = indicador.sigla?.trim().toUpperCase() === 'ICV'
  const areasProtegidas = indicador.sigla?.trim().toUpperCase() === 'ISAP'

  if (indicador.valorPercentual != null) {
    campos.push({ legenda: 'Percentual', valor: formatarNumero(indicador.valorPercentual) + '%' })
  }

  if (indicador.valorHectares != null) {
    const deficitReserva =
      indicador.sigla?.toUpperCase() === 'IRL' && Number(indicador.valorHectares) < 0
    campos.push({
      legenda: deficitReserva
        ? 'Déficit de Reserva Legal'
        : coberturaVegetal
          ? 'Área de vegetação nativa'
          : areasProtegidas
            ? 'Área sobreposta'
            : 'Área',
      valor: formatarNumero(
        deficitReserva ? Math.abs(Number(indicador.valorHectares)) : indicador.valorHectares,
        'ha',
      ),
    })
  }

  if (indicador.valorAbsoluto != null && (!areasProtegidas || indicador.valorHectares == null)) {
    const numero = Number(indicador.valorAbsoluto)
    campos.push({
      legenda: coberturaVegetal
        ? 'Saldo de vegetação nativa'
        : areasProtegidas
          ? 'Área sobreposta'
          : 'Valor absoluto',
      valor:
        indicador.valorAbsoluto !== '' && Number.isFinite(numero)
          ? numero.toLocaleString('pt-BR', { maximumFractionDigits: 3 }) +
            (coberturaVegetal || areasProtegidas ? ' ha' : '')
          : 'Não informado',
    })
  }

  return campos
}

export function requisicaoCancelada(erro) {
  return erro?.code === 'ERR_CANCELED' || erro?.name === 'AbortError'
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
    return 'O servidor não conseguiu carregar os dados do mapa. ' + 'Tente novamente.'
  }

  if (erro?.code === 'ECONNABORTED') {
    return 'O servidor demorou para responder. Tente novamente.'
  }

  if (erro?.request && !erro.response) {
    return 'Não foi possível conectar ao backend.'
  }

  const mensagem = erro?.response?.data?.mensagem || erro?.response?.data?.message

  return typeof mensagem === 'string' && mensagem.trim()
    ? mensagem
    : erro?.message || 'Não foi possível carregar os dados do mapa.'
}

export function criarMapaIndicadoresService(cliente = api) {
  return {
    async listarMapa({ signal } = {}) {
      const { data } = await cliente.get('/api/mapa', {
        signal,
      })

      if (!Array.isArray(data)) {
        throw new Error('A API retornou uma listagem de imóveis inválida.')
      }

      return data.map(normalizarImovel)
    },

    async buscarImovel(car, { signal } = {}) {
      if (typeof car !== 'string' || !car.trim()) {
        throw new Error('Informe o código CAR do imóvel.')
      }

      const codigoCar = car.trim()

      const { data } = await cliente.get(`/api/imoveis/${encodeURIComponent(codigoCar)}`, {
        signal,
      })

      const imovel = normalizarImovel(data)

      if (imovel.codigoCar !== codigoCar) {
        throw new Error('A API retornou um imóvel diferente do solicitado.')
      }

      return imovel
    },
  }
}

export const mapaIndicadoresService = criarMapaIndicadoresService()
