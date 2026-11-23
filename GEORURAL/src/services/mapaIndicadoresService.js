import api from './api'
import { normalizarGeoJson } from './mapaRenderizacaoService'
import {
  prepararCamadasIndicadores,
  obterEstiloIndicador,
} from './camadasIndicadoresService'

const numeros = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
})

const situacoesIapp = {
  CALCULADO: 'Calculado',
  SEM_APP: 'Sem APP no imóvel',
  CAMADA_INDISPONIVEL: 'Camada indisponível',
}

const situacoesIsap = {
  COM_SOBREPOSICAO: 'Com sobreposição',
  SEM_SOBREPOSICAO: 'Sem sobreposição',
  CAMADA_INDISPONIVEL: 'Camada indisponível',
}

const situacoesIfc = {
  SEM_FOCO: 'Sem focos de calor',
  SEM_FOCOS: 'Sem focos de calor',
  COM_FOCOS: 'Com focos de calor',
  AREA_INVALIDA: 'Área do imóvel inválida',
}

const situacoesIdesmat = {
  COM_DESMATAMENTO: 'Com desmatamento',
  SEM_DESMATAMENTO: 'Sem desmatamento',
  COM_SUPRESSAO: 'Com supressão',
  SEM_SUPRESSAO: 'Sem supressão',
}

export function apresentarSituacaoIndicador(indicador) {
  const sigla = indicador.sigla?.trim().toUpperCase()
  const situacao = indicador.situacao

  if (sigla === 'IDESMAT') {
    return situacoesIdesmat[situacao] || situacao || 'Não informada'
  }

  if (sigla === 'IFC') {
    return situacoesIfc[situacao] || situacao || 'Não informada'
  }

  if (sigla === 'IAPP') {
    return situacoesIapp[situacao] || situacao || 'Não informada'
  }

  if (sigla === 'ISAP') {
    return situacoesIsap[situacao] || situacao || 'Não informada'
  }

  return situacao || 'Não informada'
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
  if (
    !dado ||
    typeof dado.codigoCar !== 'string' ||
    !dado.codigoCar.trim()
  ) {
    throw new Error('A API retornou um imóvel sem código CAR.')
  }

  if (!Array.isArray(dado.indicadores)) {
    throw new Error('A API retornou uma lista de indicadores inválida.')
  }

  const siglas = new Set()

  const indicadores = dado.indicadores.map((indicador) => {
    const sigla =
      typeof indicador?.sigla === 'string'
        ? indicador.sigla.trim().toUpperCase()
        : ''

    if (!sigla || siglas.has(sigla)) {
      throw new Error(
        'A API retornou indicadores com siglas ausentes ou repetidas.',
      )
    }

    siglas.add(sigla)

    return {
      ...indicador,
      id: sigla,
      sigla,
      nome: indicador.nome || obterEstiloIndicador(sigla).nome,
      geojson: colecao(indicador.features),
      situacaoTexto: apresentarSituacaoIndicador({
        ...indicador,
        sigla,
      }),
    }
  })

  const geometria = colecao(dado.geometria)
  const codigoCar = dado.codigoCar.trim()

  return {
    id: dado.id,
    codigoCar,
    municipio: dado.municipio ?? null,
    areaTotal: dado.areaTotal ?? null,
    geojson: {
      type: 'FeatureCollection',
      features: geometria.features.map((feature) => ({
        ...feature,
        properties: {
          ...feature.properties,
          imovelId: dado.id,
          codigoCar,
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
  return prepararCamadasIndicadores(
    (imovel?.indicadores ?? []).flatMap((indicador) =>
      indicador.sigla === 'IAPP'
        ? [
            {
              ...indicador,
              nome: 'APP vegetada',
            },
            {
              id: 'IAPP-passivo',
              sigla: 'IAPP',
              variante: 'passivo',
              nome: 'Passivo ambiental de APP',
              geojson: indicador.geojsonPassivo,
            },
          ]
        : [indicador],
    ),
  )
}

function mensagemGeometria(indicador, camadas) {
  if (indicador.avisoGeometria) {
    return indicador.avisoGeometria
  }

  const temCamada = camadas.some((camada) =>
    indicador.sigla === 'IAPP'
      ? camada.sigla === indicador.sigla
      : camada.id === indicador.id,
  )

  if (temCamada) {
    return ''
  }

  if (indicador.sigla === 'IDESMAT') {
    return ['SEM_DESMATAMENTO', 'SEM_SUPRESSAO'].includes(
      indicador.situacao,
    )
      ? 'Sem desmatamento registrado no resultado vigente.'
      : 'Geometria do desmatamento indisponível no resultado do backend.'
  }

  if (indicador.sigla === 'IFC') {
    const semFocos =
      indicador.valorAbsoluto != null &&
      indicador.valorAbsoluto !== '' &&
      Number(indicador.valorAbsoluto) === 0

    return semFocos
      ? 'Nenhum foco registrado no período apurado.'
      : 'Localização dos focos indisponível no resultado do backend.'
  }

  if (indicador.sigla === 'IAPP') {
    return 'Geometria de APP indisponível.'
  }

  return 'Geometria da sobreposição indisponível.'
}

export function criarResumosIndicadoresMapa(imovel) {
  if (!imovel) return []

  const camadas = criarCamadas(imovel)

  return imovel.indicadores
    .filter((indicador) =>
      ['ISAP', 'IDESMAT', 'IFC', 'IAPP'].includes(indicador.sigla),
    )
    .map((indicador) => ({
      id: indicador.id,
      titulo: `${indicador.sigla} · ${indicador.nome}`,
      cor: obterEstiloIndicador(indicador.sigla).cor,
      situacao: apresentarSituacaoIndicador(indicador),
      valores: detalharResultado(indicador),
      mensagem: mensagemGeometria(indicador, camadas),
    }))
}

export function formatarNumero(valor, unidade = '') {
  if (
    valor == null ||
    valor === '' ||
    !Number.isFinite(Number(valor))
  ) {
    return 'Não informado'
  }

  return numeros.format(Number(valor)) + (unidade ? ` ${unidade}` : '')
}

export function formatarResultado(indicador) {
  const sigla = indicador.sigla?.trim().toUpperCase()

  if (sigla === 'IFC' || sigla === 'IDESMAT') {
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
    // A unidade do indicador descreve o percentual,
    // não necessariamente o valor absoluto.
    const unidadeAbsoluta =
      indicador.unidade?.trim() === '%'
        ? '(valor absoluto)'
        : indicador.unidade

    valores.push(
      formatarNumero(indicador.valorAbsoluto, unidadeAbsoluta),
    )
  }

  return valores.length
    ? valores.join(' · ')
    : 'Resultado não informado'
}

export function detalharResultado(indicador) {
  const campos = []
  const sigla = indicador.sigla?.trim().toUpperCase()

  if (sigla === 'IDESMAT') {
    if (indicador.valorPercentual != null) {
      campos.push({
        legenda: 'Percentual desmatado',
        valor: formatarNumero(indicador.valorPercentual, '%'),
      })
    }

    const area = indicador.valorHectares ?? indicador.valorAbsoluto

    if (area != null) {
      campos.push({
        legenda: 'Área desmatada',
        valor: formatarNumero(area, 'ha'),
      })
    }

    return campos
  }

  if (sigla === 'IFC') {
    if (indicador.valorPercentual != null) {
      const valor = Number(indicador.valorPercentual)

      campos.push({
        legenda: 'Índice de focos de calor',
        valor:
          indicador.valorPercentual !== '' && Number.isFinite(valor)
            ? `${valor.toLocaleString('pt-BR', {
                maximumFractionDigits: 4,
              })} focos/1.000 ha`
            : 'Não informado',
      })
    }

    if (indicador.valorAbsoluto != null) {
      campos.push({
        legenda: 'Focos no período',
        valor: formatarNumero(indicador.valorAbsoluto),
      })
    }

    return campos
  }

  const app = sigla === 'IAPP'
  const coberturaVegetal = sigla === 'ICV'
  const areasProtegidas = sigla === 'ISAP'

  if (indicador.valorPercentual != null) {
    campos.push({
      legenda: 'Percentual',
      valor: formatarNumero(indicador.valorPercentual, '%'),
    })
  }

  if (indicador.valorHectares != null) {
    const deficitReserva =
      sigla === 'IRL' && Number(indicador.valorHectares) < 0

    campos.push({
      legenda: deficitReserva
        ? 'Déficit de Reserva Legal'
        : coberturaVegetal
          ? 'Área de vegetação nativa'
          : areasProtegidas
            ? 'Área sobreposta'
            : app
              ? 'APP vegetada'
              : 'Área',
      valor: formatarNumero(
        deficitReserva
          ? Math.abs(Number(indicador.valorHectares))
          : indicador.valorHectares,
        'ha',
      ),
    })
  }

  if (
    indicador.valorAbsoluto != null &&
    (!areasProtegidas || indicador.valorHectares == null)
  ) {
    const numero = Number(indicador.valorAbsoluto)

    campos.push({
      legenda: coberturaVegetal
        ? 'Saldo de vegetação nativa'
        : areasProtegidas
          ? 'Área sobreposta'
          : app
            ? 'Passivo ambiental de APP'
            : 'Valor absoluto',
      valor:
        indicador.valorAbsoluto !== '' && Number.isFinite(numero)
          ? numero.toLocaleString('pt-BR', {
              maximumFractionDigits: 3,
            }) +
            (coberturaVegetal || areasProtegidas || app ? ' ha' : '')
          : 'Não informado',
    })
  }

  return campos
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
    : erro?.message || 'Não foi possível carregar os dados do mapa.'
}

export function criarMapaIndicadoresService(cliente = api) {
  return {
    async listarMapa({ signal } = {}) {
      const { data } = await cliente.get('/api/mapa', {
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

      const { data } = await cliente.get(
        `/api/imoveis/${encodeURIComponent(codigoCar)}`,
        { signal },
      )

      const imovel = normalizarImovel(data)

      if (imovel.codigoCar !== codigoCar) {
        throw new Error(
          'A API retornou um imóvel diferente do solicitado.',
        )
      }

      const indicador = imovel.indicadores.find(
        (item) => item.sigla === 'IAPP',
      )

      if (indicador) {
        try {
          const { data: resultado } = await cliente.get(
            '/api/v1/iapp/imoveis/car/' +
              encodeURIComponent(codigoCar),
            {
              signal,
              params: {
                incluirGeoJson: true,
              },
            },
          )

          if (
            resultado?.codigoCar !== codigoCar ||
            String(resultado.imovelId) !== String(imovel.id) ||
            resultado.vigente !== 'S'
          ) {
            throw new Error(
              'O resultado IAPP não corresponde ao imóvel e à versão vigente.',
            )
          }

          const calculado = resultado.status === 'CALCULADO'

          const geojson = colecao(
            calculado ? resultado.appVegetadaGeoJson : null,
          )

          const geojsonPassivo = colecao(
            calculado ? resultado.passivoGeoJson : null,
          )

          Object.assign(indicador, {
            situacao: resultado.status,
            situacaoTexto: apresentarSituacaoIndicador({
              sigla: 'IAPP',
              situacao: resultado.status,
            }),
            valorPercentual: calculado
              ? resultado.iappPct
              : null,
            valorHectares: calculado
              ? resultado.appVegetadaHa
              : null,
            valorAbsoluto: calculado
              ? resultado.passivoHa
              : null,
            versaoRegra: resultado.regraVersao,
            geojson,
            geojsonPassivo,
          })
        } catch (erro) {
          if (
            requisicaoCancelada(erro) ||
            [401, 403].includes(erro?.response?.status)
          ) {
            throw erro
          }

          indicador.avisoGeometria =
            'Não foi possível carregar as geometrias de APP. ' +
            'Consulte o imóvel novamente para tentar.'
        }
      }

      return imovel
    },
  }
}

export const mapaIndicadoresService =
  criarMapaIndicadoresService()
