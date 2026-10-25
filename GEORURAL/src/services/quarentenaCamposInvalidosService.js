export function prepararCamposInvalidos(detalhe) {
  if (!Array.isArray(detalhe?.campos)) {
    return []
  }

  const campo = detalhe.campos.find(
    item => item.chave === 'campo',
  )

  const campoIdentificado =
    typeof campo?.valor === 'string' &&
    campo.valor.trim() !== '' &&
    campo.valor !== 'Não informado' &&
    campo.valor !== 'Valor vazio'

  return detalhe.campos.map(item => {
    const destaque =
      campoIdentificado &&
      ['campo', 'valor'].includes(item.chave)

    return {
      ...item,
      destaque,
      identificacao: destaque
        ? item.chave === 'campo'
          ? 'Campo apontado pela validação'
          : 'Valor recebido no campo apontado'
        : '',
    }
  })
}
