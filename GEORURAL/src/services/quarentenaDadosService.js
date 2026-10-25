export function lerDadoOriginal(valor) {
  if (typeof valor !== 'string') {
    return valor
  }

  try {
    return JSON.parse(valor)
  } catch {
    return valor
  }
}

export function obterCampoOriginal(original, campo) {
  const dados = lerDadoOriginal(original)

  if (
    !dados ||
    typeof dados !== 'object' ||
    Array.isArray(dados) ||
    !campo
  ) {
    return undefined
  }

  const chave = Object.keys(dados).find(
    item =>
      item.toLocaleLowerCase('pt-BR') ===
      String(campo).toLocaleLowerCase('pt-BR'),
  )

  return chave === undefined ? undefined : dados[chave]
}

export function identificadorOriginal(registro) {
  const campos = [
    'recibo',
    'cod_car',
    'codigo_car',
    'cod_imovel',
    'identificador',
    'id',
  ]

  for (const campo of campos) {
    const valor = obterCampoOriginal(registro.dadoOriginal, campo)

    if (
      (typeof valor === 'string' && valor.trim()) ||
      typeof valor === 'number'
    ) {
      return String(valor)
    }
  }

  return `Registro ${registro.quarentenaId}`
}
