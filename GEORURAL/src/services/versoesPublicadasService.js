function textoOuPadrao(valor, padrao = 'Não informado') {
  if (valor == null) return padrao

  const texto = String(valor).trim()

  return texto || padrao
}

function formatarDataPublicacao(valor) {
  if (!valor) return 'Não informada'

  const data = new Date(valor)

  if (Number.isNaN(data.getTime())) {
    return 'Data não informada corretamente'
  }

  return data.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function apresentarSituacao(valor) {
  const situacao = String(valor ?? '').trim()

  if (situacao.toUpperCase() === 'VIGENTE') {
    return {
      texto: 'Vigente',
      classe: 'vigente',
    }
  }

  if (situacao.toUpperCase() === 'ANTERIOR') {
    return {
      texto: 'Anterior',
      classe: 'anterior',
    }
  }

  return {
    texto: situacao || 'Não informada',
    classe: 'neutro',
  }
}

export function prepararVersoesPublicadas(versoes) {
  if (!Array.isArray(versoes)) {
    return []
  }

  return versoes
    .filter(versao =>
      versao &&
      typeof versao === 'object' &&
      !Array.isArray(versao),
    )
    .map((versao, indice) => ({
      chave: `${versao.id ?? 'versao'}-${indice}`,
      numero: textoOuPadrao(versao.numero),
      competencia: textoOuPadrao(versao.competencia),
      dataPublicacao: formatarDataPublicacao(
        versao.dataPublicacao,
      ),
      situacao: apresentarSituacao(versao.situacao),
    }))
}
