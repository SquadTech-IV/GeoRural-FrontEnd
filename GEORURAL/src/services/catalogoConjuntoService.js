export const tiposConjunto = [
  { codigo: 'IMOVEL', nome: 'Imóvel rural (perímetro)' },
  { codigo: 'APP', nome: 'APP declarada' },
  { codigo: 'RESERVA_LEGAL', nome: 'Reserva Legal declarada' },
  { codigo: 'VEGETACAO', nome: 'Vegetação nativa' },
  { codigo: 'BIOMA', nome: 'Limites de biomas' },
  {
    codigo: 'AREA_PROTEGIDA',
    nome: 'Áreas protegidas e territórios especiais',
  },
  { codigo: 'EMBARGO', nome: 'Embargos ambientais' },
  { codigo: 'DESMATAMENTO', nome: 'Desmatamento' },
  { codigo: 'FOCO_CALOR', nome: 'Focos de calor' },
  { codigo: 'MALHA_MUNICIPAL', nome: 'Malha municipal' },
].map(tipo => Object.freeze({
  ...tipo,
  id: tipo.codigo,
}))

export const catalogoConjuntoService = {
  async listar({ signal } = {}) {
    if (signal?.aborted) {
      const erro = new Error('Consulta cancelada.')
      erro.name = 'AbortError'
      throw erro
    }

    return tiposConjunto.map(tipo => ({ ...tipo }))
  },
}
