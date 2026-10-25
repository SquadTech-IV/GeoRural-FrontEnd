function protegerCelula(valor) {
  let conteudo = String(valor ?? '')

  if (/^\s*[=+\-@]/u.test(conteudo)) {
    conteudo = `'${conteudo}`
  }

  if (/^[\t\r\n]/u.test(conteudo)) {
    conteudo = `'${conteudo}`
  }

  return `"${conteudo.replace(/"/g, '""')}"`
}

export function gerarCsvQuarentena(registros) {
  if (!Array.isArray(registros)) {
    throw new Error(
      'A lista de registros para exportação é inválida.',
    )
  }

  if (!registros.length) {
    throw new Error(
      'Não existem registros para exportar com os filtros atuais.',
    )
  }

  const cabecalho = [
    'linha',
    'identificador',
    'tipo',
    'campo',
    'motivo',
    'situacao',
  ]

  const linhas = registros.map(registro => {
    if (
      !registro ||
      typeof registro !== 'object' ||
      Array.isArray(registro)
    ) {
      throw new Error(
        'A exportação contém um registro inválido.',
      )
    }

    return [
      registro.linha,
      registro.identificador,
      registro.tipo,
      registro.campo,
      registro.motivo,
      registro.situacao,
    ]
  })

  return '\uFEFF' + [
    cabecalho,
    ...linhas,
  ].map(
    linha => linha.map(protegerCelula).join(';'),
  ).join('\r\n')
}

export function exportarRegistrosQuarentena(
  registros,
  execucaoId,
) {
  const id = String(execucaoId ?? '').trim()

  if (!/^[1-9]\d*$/.test(id)) {
    throw new Error(
      'Selecione uma execução válida para exportar.',
    )
  }

  const csv = gerarCsvQuarentena(registros)

  const arquivo = new Blob(
    [csv],
    { type: 'text/csv;charset=utf-8;' },
  )

  const url = URL.createObjectURL(arquivo)
  const link = document.createElement('a')

  try {
    link.href = url
    link.download =
      `quarentena-execucao-${id}-filtrados.csv`

    document.body.appendChild(link)
    link.click()
  } finally {
    link.remove()

    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 1000)
  }
}
