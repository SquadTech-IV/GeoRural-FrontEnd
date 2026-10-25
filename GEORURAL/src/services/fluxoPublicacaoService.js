function identificadorValido(valor) {
  if (
    typeof valor === 'number' &&
    !Number.isSafeInteger(valor)
  ) {
    return false
  }

  return /^[1-9]\d*$/.test(
    String(valor ?? '').trim(),
  )
}

export function avaliarPublicacao({
  resultado,
  versao,
  publicando = false,
}) {
  if (publicando) {
    return {
      permitido: false,
      motivo:
        'Aguarde a resposta da operação em andamento.',
    }
  }

  if (!resultado) {
    return {
      permitido: false,
      motivo:
        'Consulte os resultados da validação primeiro.',
    }
  }

  if (!identificadorValido(resultado.execucaoId)) {
    return {
      permitido: false,
      motivo:
        'A execução da validação não foi identificada.',
    }
  }

  if (resultado.aprovado !== true) {
    return {
      permitido: false,
      motivo:
        'A validação precisa estar aprovada para solicitar a publicação.',
    }
  }

  if (!identificadorValido(versao?.id)) {
    return {
      permitido: false,
      motivo:
        'Informe a versão correspondente aos resultados conferidos.',
    }
  }

  if (
    versao.situacao &&
    versao.situacao !== 'RASCUNHO'
  ) {
    return {
      permitido: false,
      motivo: 'Esta versão não está em rascunho.',
    }
  }

  if (
    versao.execucaoId != null &&
    String(versao.execucaoId) !==
      String(resultado.execucaoId)
  ) {
    return {
      permitido: false,
      motivo:
        'Consulte a execução vinculada à versão selecionada.',
    }
  }

  return {
    permitido: true,
    motivo:
      'Confira a versão e confirme a solicitação de publicação.',
  }
}

export function prepararSolicitacaoPublicacao({
  resultado,
  versao,
  publicando = false,
}) {
  const avaliacao = avaliarPublicacao({
    resultado,
    versao,
    publicando,
  })

  if (!avaliacao.permitido) {
    throw new Error(avaliacao.motivo)
  }

  return {
    versaoId: String(versao.id).trim(),
    execucaoId: String(resultado.execucaoId).trim(),
  }
}
