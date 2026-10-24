import { conjuntoService } from './conjuntoService'
import { arquivoService, prepararArquivosUpload } from './arquivoService'

export function criarFluxoConjuntoUpload(aoPersistir) {
  let registro = null
  const aceitos = new Set()

  function limpar() {
    registro = null
    aceitos.clear()
  }

  async function salvar(dados) {
    const arquivos = dados.arquivos?.length ? prepararArquivosUpload(dados.arquivos) : []
    if (arquivos.length && dados.upload !== true)
      throw new Error('Ative Upload para enviar os arquivos selecionados.')
    const cadastro = { ...dados }
    delete cadastro.arquivos
    if (registro) cadastro.id = registro.id
    registro = await conjuntoService.salvar(cadastro)
    aoPersistir(registro)
    const pendentes = arquivos.filter((arquivo) => !aceitos.has(arquivo))
    if (!pendentes.length) return { registro, quantidade: 0 }
    try {
      const resultados = await arquivoService.enviarIngestao(pendentes, registro.id)
      if (
        !Array.isArray(resultados) ||
        resultados.length !== pendentes.length ||
        resultados.some((resultado) => typeof resultado?.aceito !== 'boolean')
      ) {
        throw new Error(
          'A resposta do upload não permitiu confirmar os arquivos recebidos. Confira os arquivos recentes antes de reenviar.',
        )
      }
      resultados.forEach((resultado, indice) => {
        if (resultado.aceito) aceitos.add(pendentes[indice])
      })
      const rejeitados = pendentes.filter((arquivo) => !aceitos.has(arquivo))
      if (rejeitados.length) {
        throw new Error(
          `Arquivo(s) rejeitado(s): ${rejeitados.map((arquivo) => arquivo.name).join(', ')}.`,
        )
      }
      return { registro, quantidade: pendentes.length }
    } catch (causa) {
      const erro = new Error('O conjunto foi salvo, mas o envio dos arquivos não foi concluído.', {
        cause: causa,
      })
      erro.registro = registro
      erro.arquivosPendentes = pendentes.filter((arquivo) => !aceitos.has(arquivo))
      throw erro
    }
  }

  return { salvar, limpar }
}
