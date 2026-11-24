// Fonte unica das situacoes de indicador no front.
//
// O back grava rin_situacao com um codigo por indicador. Antes isso estava
// espalhado: o mapaIndicadoresService tinha um mapa por sigla e o
// consultaIndicadoresService tinha uma lista propria, incompleta -- ICV, IDESMAT
// e IFC caiam em "neutro" e apareciam cinza em vez de verde ou vermelho.
//
// SITUACAO_BOA_POR_INDICADOR tem que continuar igual ao v_boa do
// agregar_municipio (R__6_pkg_calculo.sql): e o mesmo contrato nos dois lados.

export const ROTULO_SITUACAO = {
  // IRL
  CONFORME: 'Conforme',
  DEFICIT: 'Déficit',
  NAO_CONFORME: 'Não conforme',
  // IAE
  SEM_EMBARGO: 'Sem embargo',
  COM_EMBARGO: 'Com embargo',
  // ICV
  CONSERVADO: 'Conservado',
  DEGRADADO: 'Degradado',
  // IDESMAT
  SEM_DESMATAMENTO: 'Sem desmatamento',
  COM_DESMATAMENTO: 'Com desmatamento',
  SEM_SUPRESSAO: 'Sem supressão',
  COM_SUPRESSAO: 'Com supressão',
  // IFC
  SEM_FOCO: 'Sem focos de calor',
  SEM_FOCOS: 'Sem focos de calor',
  COM_FOCOS: 'Com focos de calor',
  // ISAP
  SEM_SOBREPOSICAO: 'Sem sobreposição',
  COM_SOBREPOSICAO: 'Com sobreposição',
  // IAPP
  CALCULADO: 'Calculado',
  SEM_APP: 'Sem APP no imóvel',
  // comuns a varios
  AREA_INVALIDA: 'Área do imóvel inválida',
  CAMADA_INDISPONIVEL: 'Camada indisponível',
}

// situacao que representa o imovel em ordem
const SITUACOES_BOAS = [
  'CONFORME',
  'SEM_EMBARGO',
  'CONSERVADO',
  'SEM_DESMATAMENTO',
  'SEM_SUPRESSAO',
  'SEM_FOCO',
  'SEM_FOCOS',
  'SEM_SOBREPOSICAO',
  'SEM_APP',
]

// situacao que representa problema no imovel
const SITUACOES_RUINS = [
  'DEFICIT',
  'NAO_CONFORME',
  'COM_EMBARGO',
  'DEGRADADO',
  'COM_DESMATAMENTO',
  'COM_SUPRESSAO',
  'COM_FOCOS',
  'COM_SOBREPOSICAO',
]

// espelha o v_boa do agregar_municipio no PKG_CALCULO
export const SITUACAO_BOA_POR_INDICADOR = {
  IRL: 'CONFORME',
  IAE: 'SEM_EMBARGO',
  ICV: 'CONSERVADO',
  IDESMAT: 'SEM_DESMATAMENTO',
  IFC: 'SEM_FOCOS',
  ISAP: 'SEM_SOBREPOSICAO',
  // o IAPP grava CALCULADO/SEM_APP/CAMADA_INDISPONIVEL, que sao estados da apuracao
  // e nao veredito: a qualidade dele esta no percentual, nao na situacao
  IAPP: null,
}

// normaliza o codigo que veio do back
function codigoDe(situacao) {
  return String(situacao ?? '')
    .trim()
    .toUpperCase()
}

// rotulo legivel; codigo desconhecido vira texto sem underscore em vez de sumir
export function rotularSituacao(situacao) {
  const codigo = codigoDe(situacao)
  if (!codigo) return 'Não informada'
  return ROTULO_SITUACAO[codigo] || codigo.replace(/_/g, ' ')
}

// 'sucesso' | 'erro' | 'neutro', para a cor na tabela e no grafico
export function classeDaSituacao(situacao) {
  const codigo = codigoDe(situacao)
  if (SITUACOES_BOAS.includes(codigo)) return 'sucesso'
  if (SITUACOES_RUINS.includes(codigo)) return 'erro'
  return 'neutro'
}

// true so quando a situacao e reconhecidamente ruim; desconhecida nao conta
export function situacaoEhRuim(situacao) {
  return SITUACOES_RUINS.includes(codigoDe(situacao))
}

export function apresentarSituacao(situacao) {
  return {
    texto: rotularSituacao(situacao),
    classe: classeDaSituacao(situacao),
  }
}
