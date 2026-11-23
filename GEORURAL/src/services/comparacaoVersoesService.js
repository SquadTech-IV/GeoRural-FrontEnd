import api from './api'

export const rotulosComparacao = {
  IGUAL: 'Igual',
  ALTERADO: 'Alterado',
  APENAS_EM_A: 'Apenas em A',
  APENAS_EM_B: 'Apenas em B',
  REGRA: 'Regra',
  PARAMETRO: 'Parâmetro',
  DADO_DE_ORIGEM: 'Dado de origem',
  NAO_IDENTIFICADO: 'Não identificado',
}

export function formatarValorComparacao(valor, unidade = '') {
  return valor == null
    ? 'Não informado'
    : Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: 3 }) +
        (unidade ? ` ${unidade}` : '')
}

export function mensagemErroComparacao(erro) {
  if (erro?.response?.status === 401)
    return 'Sua sessão expirou. Entre novamente para consultar a comparação.'
  if (erro?.response?.status === 403) return 'Seu perfil não tem permissão para comparar versões.'
  return (
    erro?.response?.data?.mensagem ||
    erro?.response?.data?.message ||
    erro?.message ||
    'Não foi possível carregar a comparação.'
  )
}

export function criarComparacaoVersoesService(cliente = api) {
  return {
    async listarVersoes({ signal } = {}) {
      const { data } = await cliente.get('/api/versoes', { signal })
      if (!Array.isArray(data)) throw new Error('Lista de versões inválida.')
      return data.filter((v) => v.dataPublicacao && ['VIGENTE', 'ANTERIOR'].includes(v.situacao))
    },
    async comparar(
      { indicador, versaoA, versaoB, apenasAlterados = false, pagina = 0, tamanho = 20 },
      { signal } = {},
    ) {
      if (!indicador || !/^[1-9]\d*$/.test(String(versaoA)) || !/^[1-9]\d*$/.test(String(versaoB)))
        throw new Error('Selecione o indicador e as duas versões publicadas.')
      if (String(versaoA) === String(versaoB))
        throw new Error('Escolha duas versões diferentes para comparar.')
      if (
        !Number.isInteger(pagina) ||
        pagina < 0 ||
        !Number.isInteger(tamanho) ||
        tamanho < 1 ||
        tamanho > 200
      )
        throw new Error('Paginação inválida.')
      const { data } = await cliente.get('/api/v1/linhagem/comparacao', {
        signal,
        params: { indicador, versaoA, versaoB, apenasAlterados, pagina, tamanho },
      })
      if (!data?.resumo || !Array.isArray(data.imoveis?.itens) || !data.versaoA || !data.versaoB)
        throw new Error('Resposta da comparação inválida.')
      if (
        String(data.versaoA.versaoId) !== String(versaoA) ||
        String(data.versaoB.versaoId) !== String(versaoB) ||
        data.indicador?.sigla !== indicador
      )
        throw new Error('A comparação retornada não corresponde à seleção.')
      return data
    },
  }
}

export const comparacaoVersoesService = criarComparacaoVersoesService()
