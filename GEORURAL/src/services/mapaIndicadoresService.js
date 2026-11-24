import api from './api'
import { normalizarGeoJson } from './mapaRenderizacaoService'
import {
  prepararCamadasIndicadores,
  obterEstiloIndicador,
} from './camadasIndicadoresService'
import { rotularSituacao } from '../utils/situacoesIndicador'

const numeros = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
})

// os quatro mapas por sigla sairam daqui para utils/situacoesIndicador.js: os
// codigos nao se repetem entre indicadores, entao o rotulo nao precisa da sigla --
// e assim IRL e IAE, que cairam no codigo cru, tambem ganham rotulo
export function apresentarSituacaoIndicador(indicador) {
  return rotularSituacao(indicador?.situacao)
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

// O mesmo numero gravado em valorHectares e em valorAbsoluto nao e dois
// resultados: e o calculo guardando a mesma area nas duas colunas. Comparado com
// tolerancia porque os dois lados chegam arredondados do banco.
function repeteHectares(indicador) {
  if (indicador.valorHectares == null || indicador.valorAbsoluto == null) return false

  const hectares = Number(indicador.valorHectares)
  const absoluto = Number(indicador.valorAbsoluto)

  if (!Number.isFinite(hectares) || !Number.isFinite(absoluto)) return false

  return Math.abs(hectares - absoluto) < 0.0001
}

// Um indicador so tem resultado quando algum valor chegou. Zero e resultado:
// "0% de embargo" quer dizer que o calculo olhou e nao achou nada, e isso precisa
// aparecer. Valor nenhum nao e resultado -- e o calculo sem ter o que medir, e a
// tela mostrava isso como um card completo dizendo "Resultado nao informado",
// enchendo a lista de indicador que o imovel nao tem.
export function indicadorTemResultado(indicador) {
  const chegou = (valor) => valor != null && valor !== ''

  return (
    chegou(indicador?.valorPercentual) ||
    chegou(indicador?.valorHectares) ||
    chegou(indicador?.valorAbsoluto)
  )
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
  const reservaLegal = sigla === 'IRL'
  const embargo = sigla === 'IAE'

  if (indicador.valorPercentual != null) {
    campos.push({
      legenda: 'Percentual',
      valor: formatarNumero(indicador.valorPercentual, '%'),
    })
  }

  if (indicador.valorHectares != null) {
    campos.push({
      legenda: reservaLegal
        ? 'Reserva Legal declarada'
        : coberturaVegetal
          ? 'Área de vegetação nativa'
          : areasProtegidas
            ? 'Área sobreposta'
            : app
              ? 'APP vegetada'
              : embargo
                ? 'Área embargada'
                : 'Área',
      valor: formatarNumero(indicador.valorHectares, 'ha'),
    })
  }

  // O saldo da Reserva Legal esta em valorAbsoluto, nao em valorHectares: no IRL
  // o valorHectares e a area declarada da reserva, que nunca e negativa. O teste
  // antigo procurava o deficit ali, entao o rotulo "Deficit de Reserva Legal"
  // nunca aparecia e o saldo caia no generico, saindo como
  // "Valor absoluto: -36,316" -- sem unidade e sem dizer o que era.
  //
  // E o absoluto so aparece quando acrescenta algo. No ICV, no ISAP e no IAE ele
  // repete o valorHectares, e a tela mostrava o mesmo numero duas vezes com dois
  // rotulos diferentes -- no ICV um deles dizendo "Saldo", que nao e o que aquele
  // numero e. Antes isso estava tratado so para o ISAP, sigla por sigla.
  if (indicador.valorAbsoluto != null && !repeteHectares(indicador)) {
    const numero = Number(indicador.valorAbsoluto)
    const valido = indicador.valorAbsoluto !== '' && Number.isFinite(numero)
    const emHectares = reservaLegal || coberturaVegetal || areasProtegidas || app

    campos.push({
      legenda: reservaLegal
        ? numero < 0
          ? 'Déficit de Reserva Legal'
          : 'Excedente de Reserva Legal'
        : coberturaVegetal
          ? 'Saldo de vegetação nativa'
          : areasProtegidas
            ? 'Área sobreposta'
            : app
              ? 'Passivo ambiental de APP'
              : 'Valor absoluto',
      valor: valido
        ? (reservaLegal ? Math.abs(numero) : numero).toLocaleString('pt-BR', {
            maximumFractionDigits: 3,
          }) +
          (emHectares ? ' ha' : '')
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