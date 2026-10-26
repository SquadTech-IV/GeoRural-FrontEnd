import api from './api'
import { texto, validarId, validarCampo, exigirFormularioValido } from './cadastroService'

export const esferasFonte = ['Federal', 'Estadual', 'Municipal', 'Outra']

export const tiposFonte = [
  { nome: 'Imóvel rural (perímetro)', icone: '🏞️', indicadores: 'Base · todos' },
  { nome: 'APP declarada', icone: '💧', indicadores: 'IAPP · ICV' },
  { nome: 'Reserva Legal declarada', icone: '🌿', indicadores: 'IRL' },
  { nome: 'Vegetação nativa', icone: '🌳', indicadores: 'ICV · IAPP' },
  { nome: 'Limites de biomas', icone: '🌎', indicadores: 'IRL' },
  { nome: 'Áreas protegidas e territórios especiais', icone: '🛡️', indicadores: 'ISAP' },
  { nome: 'Embargos ambientais', icone: '⛔', indicadores: 'IAE' },
  { nome: 'Desmatamento', icone: '🪓', indicadores: 'IDesmat' },
  { nome: 'Focos de calor', icone: '🔥', indicadores: 'IFC' },
  { nome: 'Malha municipal', icone: '🗺️', indicadores: 'Agregação' },
]

export const camposFonte = [
  { chave: 'nome', titulo: 'Nome da fonte', limite: 120, obrigatorio: true },
  { chave: 'sigla', titulo: 'Sigla / órgão', limite: 20, obrigatorio: true },
  { chave: 'esfera', titulo: 'Esfera', limite: 20, obrigatorio: false },
]

export function criarFormularioFonte(fonte = null) {
  return {
    nome: fonte?.nome ?? '',
    sigla: fonte?.sigla ?? '',
    esfera: fonte?.esfera ?? '',
    orgao: fonte?.orgao ?? null,
    descricao: fonte?.descricao ?? null,
    oferece: Array.isArray(fonte?.oferece) ? [...fonte.oferece] : [],
  }
}

export function validarFonte(dados, fontes = [], id = null, conjuntos = []) {
  const erros = {}
  for (const campo of camposFonte) validarCampo(erros, campo.chave, dados[campo.chave], campo.limite, campo.obrigatorio)
  for (const campo of ['nome', 'sigla']) {
    if (fontes.some((f) => String(f.id) !== String(id) && texto(f[campo]).toLocaleLowerCase('pt-BR') === texto(dados[campo]).toLocaleLowerCase('pt-BR'))) {
      erros[campo] = `Já existe uma fonte com ${campo === 'nome' ? 'esse nome' : 'essa sigla'}.`
    }
  }
  if (!Array.isArray(dados.oferece) || dados.oferece.some((nome) => !tiposFonte.some((tipo) => tipo.nome === nome))) {
    erros.oferece = 'Selecione apenas conjuntos da lista.'
  } else if (new Set(dados.oferece).size !== dados.oferece.length) {
    erros.oferece = 'Não repita os conjuntos selecionados.'
  }
  if (Array.isArray(dados.oferece) && conjuntos.some((conjunto) =>
    id != null && String(conjunto.fonteId) === String(id) && !dados.oferece.includes(conjunto.nome),
  )) {
    erros.oferece = 'Mantenha selecionados os tipos que possuem conjuntos cadastrados.'
  }
  return erros
}

export function possuiConjuntoDaFonte(conjuntos, fonteId, nome) {
  return fonteId != null && conjuntos.some((conjunto) =>
    String(conjunto.fonteId) === String(fonteId) && conjunto.nome === nome,
  )
}

export function prepararFonte(dados) {
  exigirFormularioValido(validarFonte(dados))
  return {
    nome: texto(dados.nome), sigla: texto(dados.sigla).toUpperCase(), orgao: texto(dados.orgao) || null,
    esfera: texto(dados.esfera) || null, descricao: texto(dados.descricao) || null, oferece: [...dados.oferece],
  }
}

export function adaptarFonte(dado) {
  if (!dado || typeof dado.ativo !== 'boolean') throw new Error('A API retornou uma fonte inválida.')
  return { ...dado, id: validarId(dado.id), cadastradoEm: dado.dataCadastro }
}

export const fonteService = {
  async listar({ signal } = {}) {
    const { data } = await api.get('/api/fontes', { signal })
    if (!Array.isArray(data)) throw new Error('A API retornou uma lista de fontes inválida.')
    return data.map(adaptarFonte)
  },
  async salvar(dados) {
    const payload = prepararFonte(dados)
    const { data } = dados.id == null
      ? await api.post('/api/fontes', payload)
      : await api.put(`/api/fontes/${validarId(dados.id)}`, payload)
    return adaptarFonte(data)
  },
  async alterarStatus(fonte) {
    const id = validarId(fonte.id)
    if (fonte.ativo) { await api.delete(`/api/fontes/${id}`); return { ...fonte, ativo: false } }
    const { data } = await api.patch(`/api/fontes/${id}/reativar`)
    return adaptarFonte(data)
  },
}
