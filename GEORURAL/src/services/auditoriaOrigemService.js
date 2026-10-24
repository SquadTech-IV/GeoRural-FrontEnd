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

export function prepararArquivosOrigem(linhagem) {
  if (!linhagem) return []

  const arquivos =
    linhagem.arquivosOrigem ??
    linhagem.arquivos ??
    []

  if (!Array.isArray(arquivos)) {
    throw new Error(
      'A linhagem retornou uma lista de arquivos de origem inválida.',
    )
  }

  const identificadores = new Set()

  return arquivos.map((arquivo, indice) => {
    if (
      !arquivo ||
      typeof arquivo !== 'object' ||
      Array.isArray(arquivo)
    ) {
      throw new Error(
        'A linhagem retornou um arquivo de origem inválido.',
      )
    }

    const valorId =
      arquivo.id ??
      arquivo.arquivoId ??
      arquivo.arquivoBrutoId

    const id = identificadorValido(valorId)
      ? String(valorId).trim()
      : null

    if (id && identificadores.has(id)) {
      return null
    }

    if (id) {
      identificadores.add(id)
    }

    const nome =
      arquivo.nomeOriginal ??
      arquivo.nomeArquivo ??
      arquivo.nome

    return {
      chave: id ?? `arquivo-sem-id-${indice}`,
      id,
      nome:
        typeof nome === 'string' && nome.trim()
          ? nome.trim()
          : 'Arquivo de origem',
      hash:
        typeof arquivo.hash === 'string'
          ? arquivo.hash.trim()
          : '',
      destino: id
        ? {
            name: 'DetalheArquivoRecebido',
            params: { id },
          }
        : null,
    }
  }).filter(Boolean)
}
