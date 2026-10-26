import { ref } from 'vue'

import {
  identificadorOriginal,
  lerDadoOriginal,
  obterCampoOriginal,
} from './quarentenaDadosService'

import {
  quarentenaService,
  requisicaoQuarentenaCancelada,
  validarIdQuarentena,
} from './quarentenaService'

function texto(valor) {
  if (valor === null || valor === undefined) {
    return 'Não informado'
  }

  if (typeof valor === 'string') {
    return valor.trim() || 'Valor vazio'
  }

  if (typeof valor === 'object') {
    return JSON.stringify(valor, null, 2)
  }

  return String(valor)
}

export function prepararDetalheQuarentena(dados, registroId) {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
    throw new Error(
      'O backend retornou um detalhe de quarentena inválido.',
    )
  }

  const id = validarIdQuarentena(registroId)
  const idRetornado = dados.id ?? dados.quarentenaId

  if (
    idRetornado != null &&
    validarIdQuarentena(idRetornado) !== id
  ) {
    throw new Error('O detalhe recebido pertence a outro registro.')
  }

  return {
    id,
    campos: [
      {
        chave: 'registro',
        titulo: 'Registro',
        valor: texto(
          dados.identificador ??
          dados.identificadorRegistro ??
          identificadorOriginal(dados),
        ),
      },
      {
        chave: 'linha',
        titulo: 'Linha de origem',
        valor: texto(dados.linhaOrigem ?? dados.linha),
      },
      {
        chave: 'tipo',
        titulo: 'Tipo de inconsistência',
        valor: texto(
          dados.codigoRegra ??
          dados.tipoRegra ??
          dados.tipo ??
          dados.regra?.tipo,
        ),
      },
      {
        chave: 'campo',
        titulo: 'Campo',
        valor: texto(dados.colunaErro ?? dados.campo),
      },
      {
        chave: 'valor',
        titulo: 'Valor recebido',
        valor: (() => {
          const valor = obterCampoOriginal(
            dados.dadoOriginal,
            dados.colunaErro,
          )

          return valor === null ? 'null' : texto(valor)
        })(),
      },
      {
        chave: 'regra',
        titulo: 'Regra violada',
        valor: texto(dados.nomeRegra ?? dados.regra?.nome),
      },
      {
        chave: 'situacao',
        titulo: 'Situação',
        valor: texto(dados.situacao ?? dados.status),
      },
      {
        chave: 'arquivo',
        titulo: 'Arquivo de origem',
        valor: texto(
          dados.nomeArquivoBruto ??
          dados.nomeArquivo ??
          dados.arquivo?.nomeOriginal ??
          dados.arquivo?.nome,
        ),
      },
      {
        chave: 'original',
        titulo: 'Dado original recebido',
        valor: texto(lerDadoOriginal(dados.dadoOriginal)),
      },
    ],
    motivo: texto(dados.motivoErro ?? dados.motivo),
  }
}

export function criarConsultaDetalheQuarentena() {
  const detalhe = ref(null)
  const carregando = ref(false)
  const falhou = ref(false)

  let consulta = null
  let destruido = false

  function limpar() {
    consulta?.abort()
    consulta = null

    detalhe.value = null
    carregando.value = false
    falhou.value = false
  }

  async function consultar(registroId, { registro } = {}) {
    if (destruido) return

    limpar()

    const atual = new AbortController()
    consulta = atual
    carregando.value = true

    try {
      const id = validarIdQuarentena(registroId)

      const dados = await quarentenaService.consultarRegistro(id, {
        signal: atual.signal,
        registro,
      })

      if (
        destruido ||
        atual.signal.aborted ||
        consulta !== atual
      ) {
        return
      }

      detalhe.value = prepararDetalheQuarentena(dados, id)
    } catch (erro) {
      if (
        destruido ||
        atual.signal.aborted ||
        consulta !== atual ||
        requisicaoQuarentenaCancelada(erro)
      ) {
        return
      }

      falhou.value = true
      throw erro
    } finally {
      if (!destruido && consulta === atual) {
        carregando.value = false
        consulta = null
      }
    }
  }

  function destruir() {
    destruido = true
    limpar()
  }

  return {
    detalhe,
    carregando,
    falhou,
    consultar,
    limpar,
    destruir,
  }
}
