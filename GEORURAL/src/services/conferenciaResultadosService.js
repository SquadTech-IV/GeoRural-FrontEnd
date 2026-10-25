function formatarQuantidade(valor) {
  if (
    typeof valor !== 'number' ||
    !Number.isSafeInteger(valor) ||
    valor < 0
  ) {
    return 'Não informado'
  }

  return valor.toLocaleString('pt-BR')
}

function textoOuPadrao(valor, padrao = 'Não informado') {
  return typeof valor === 'string' && valor.trim()
    ? valor.trim()
    : padrao
}

export function prepararConferenciaResultados(resultado) {
  if (
    !resultado ||
    typeof resultado !== 'object' ||
    Array.isArray(resultado)
  ) {
    return null
  }

  const percentual = resultado.percentualAprovacao

  const percentualValido =
    typeof percentual === 'number' &&
    Number.isFinite(percentual) &&
    percentual >= 0 &&
    percentual <= 100

  const regras = Array.isArray(resultado.regrasVioladas)
    ? resultado.regrasVioladas
    : []

  const motivos = Array.isArray(resultado.motivosReprovacao)
    ? resultado.motivosReprovacao
    : []

  let conclusao = 'Conclusão não informada'
  let classeConclusao = 'neutro'

  if (resultado.aprovado === true) {
    conclusao = 'Aprovado na validação'
    classeConclusao = 'sucesso'
  } else if (resultado.aprovado === false) {
    conclusao = 'Reprovado na validação'
    classeConclusao = 'erro'
  }

  return {
    execucaoId: resultado.execucaoId ?? 'Não informado',

    statusValidacao: textoOuPadrao(
      resultado.statusValidacao,
    ),

    conclusao,
    classeConclusao,

    indicadores: [
      {
        chave: 'total',
        titulo: 'Total de registros',
        valor: formatarQuantidade(resultado.totalRegistros),
        classe: 'neutro',
      },
      {
        chave: 'validos',
        titulo: 'Registros válidos',
        valor: formatarQuantidade(resultado.registrosValidos),
        classe: 'sucesso',
      },
      {
        chave: 'invalidos',
        titulo: 'Registros inválidos',
        valor: formatarQuantidade(resultado.registrosInvalidos),
        classe: 'erro',
      },
      {
        chave: 'quarentena',
        titulo: 'Em quarentena',
        valor: formatarQuantidade(
          resultado.registrosEmQuarentena,
        ),
        classe: 'aviso',
      },
    ],

    percentual: percentualValido ? percentual : null,

    percentualFormatado: percentualValido
      ? `${percentual.toLocaleString('pt-BR', {
          maximumFractionDigits: 2,
        })}%`
      : 'Não informado',

    regras: regras
      .filter(regra =>
        regra &&
        typeof regra === 'object' &&
        !Array.isArray(regra),
      )
      .map(regra => ({
        nome: textoOuPadrao(regra.nomeRegra),
        tipo: textoOuPadrao(regra.tipo),
        severidade: textoOuPadrao(regra.severidade),
        quantidade: formatarQuantidade(regra.quantidade),
      })),

    motivos: motivos
      .filter(motivo => typeof motivo === 'string')
      .map(motivo => motivo.trim())
      .filter(Boolean),
  }
}
