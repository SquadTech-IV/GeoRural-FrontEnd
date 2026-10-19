import api from './api'
import { validarId } from './cadastroService'

export const catalogoConjuntoService = {
  async listar({ signal } = {}) {
    const { data } = await api.get('/api/tipos-conjunto', {
      signal,
    })

    if (!Array.isArray(data)) {
      throw new Error(
        'A API retornou um catálogo de conjuntos inválido.',
      )
    }

    const ids = new Set()
    const nomes = new Set()

    return data.map((tipo) => {
      if (
        !tipo ||
        typeof tipo.nome !== 'string' ||
        !tipo.nome.trim() ||
        typeof tipo.codigo !== 'string' ||
        !tipo.codigo.trim()
      ) {
        throw new Error(
          'A API retornou um tipo de conjunto inválido.',
        )
      }

      const id = validarId(tipo.id)
      const nome = tipo.nome.trim()

      if (ids.has(id) || nomes.has(nome)) {
        throw new Error(
          'O catálogo contém tipos repetidos.',
        )
      }

      ids.add(id)
      nomes.add(nome)

      return {
        ...tipo,
        id,
        nome,
        codigo: tipo.codigo.trim().toUpperCase(),
      }
    })
  },
}
