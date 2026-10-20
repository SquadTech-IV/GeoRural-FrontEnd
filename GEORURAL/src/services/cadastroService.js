export function texto(valor) {
  return String(valor ?? '').trim()
}

export function normalizarBusca(valor) {
  return texto(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
}

export function validarId(valor) {
  const id = Number(valor)

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error('Identificador de cadastro inválido.')
  }

  return id
}

export function mensagemErroCadastro(erro) {
  const mensagem =
    erro?.response?.data?.mensagem ||
    erro?.response?.data?.message

  if (typeof mensagem === 'string' && mensagem.trim()) {
    return mensagem
  }

  if (erro?.code === 'ECONNABORTED') {
    return 'O servidor demorou para responder. Tente novamente.'
  }

  if (erro?.request && !erro.response) {
    return 'Não foi possível conectar ao backend.'
  }

  return erro?.message || 'Não foi possível concluir a operação.'
}

export function validarCampo(
  erros,
  campo,
  valor,
  limite,
  obrigatorio = true,
) {
  const dado = texto(valor)

  if (obrigatorio && !dado) {
    erros[campo] = 'Preencha este campo.'
  } else if (dado.length > limite) {
    erros[campo] = `Utilize no máximo ${limite} caracteres.`
  }
}

export function exigirFormularioValido(erros) {
  if (Object.keys(erros).length) {
    throw new Error(Object.values(erros).join(' '))
  }
}

export function formatarDataCadastro(valor) {
  const partes = String(valor ?? '')
    .match(/^(\d{4})-(\d{2})-(\d{2})/)

  return partes
    ? `${partes[3]}/${partes[2]}/${partes[1]}`
    : '—'
}

export function quantidadeConjuntos(fonte, conjuntos) {
  return conjuntos.filter(
    (conjunto) =>
      String(conjunto.fonteId) === String(fonte.id),
  ).length
}
