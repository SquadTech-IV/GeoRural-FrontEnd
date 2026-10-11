<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import BarraNavegacao from '../components/BarraNavegacao.vue'
import IconEye from '../components/icons/IconEye.vue'
import IconProcess from '../components/icons/IconProcess.vue'
import ModalProcessamento from '../components/ModalProcessamento.vue'
import ModalVisualizacaoCSV from '../components/ModalVisualizacaoCSV.vue'
import { arquivoService } from '../services/arquivoService'

const router = useRouter()

const mostrarModal = ref(false)
const mostrarModalVisualizacao = ref(false)
const dadosCSV = ref([])
const dadosCadastrados = ref([])

const processando = ref(false)
const processamentoConcluido = ref(false)
const erroProcessamento = ref('')
const arquivoSelecionadoParaProcessar = ref(null)

function formatarData(data) {
  if (!data) return '—'

  const partes = String(data).match(/^(\d{4})-(\d{2})-(\d{2})/)

  if (!partes) return String(data)

  return `${partes[3]}/${partes[2]}/${partes[1]}`
}

async function carregarArquivos() {
  try {
    const dados = await arquivoService.listar()
    dadosCadastrados.value = dados
  } catch (erro) {
    console.error('Erro ao carregar arquivos:', erro)
  }
}

async function visualizarDados(dado) {
  try {
    const detalhe = await arquivoService.detalhe(dado.id)

    dadosCSV.value = detalhe.dados || []
    mostrarModalVisualizacao.value = true
  } catch (erro) {
    console.error('Erro ao buscar detalhes do arquivo:', erro)
  }
}

async function processarDados(dado) {
  if (processando.value) return

  arquivoSelecionadoParaProcessar.value = dado.id
  processamentoConcluido.value = false
  erroProcessamento.value = ''
  processando.value = true
  mostrarModal.value = true

  try {
    await arquivoService.processar(dado.id)
    processamentoConcluido.value = true
  } catch (erro) {
    console.error('Erro ao processar arquivo:', erro)

    erroProcessamento.value =
      erro.response?.data?.mensagem ||
      erro.response?.data?.message ||
      'Não foi possível processar o arquivo. Tente novamente.'
  } finally {
    processando.value = false
  }
}

function fecharModalProcessamento() {
  if (processando.value) return

  mostrarModal.value = false
  arquivoSelecionadoParaProcessar.value = null
}

function handleProcessamentoFinalizado() {
  mostrarModal.value = false
  arquivoSelecionadoParaProcessar.value = null
  router.push({ name: 'Imoveis' })
}

onMounted(carregarArquivos)
</script>

<template>
  <BarraNavegacao />

  <div class="Conteudo">
    <h3>Verificar Dados Existentes</h3>

    <p>
      Verifique dados já existentes no sistema e os processos associados.
    </p>
  </div>

  <div class="Dados-Cadastrados">
    <div class="Dados-Cadastrados-Titulo">
      <h2>Dados Cadastrados</h2>
    </div>

    <table class="tabela-dados">
      <thead>
        <tr>
          <th>Nome do Arquivo</th>
          <th>Data de Cadastro</th>
          <th>Visualizar Arquivo</th>
          <th>Processar Arquivo</th>
        </tr>
      </thead>

      <tbody>
        <tr v-if="dadosCadastrados.length === 0">
          <td colspan="4" class="vazio">
            Nenhum arquivo encontrado.
          </td>
        </tr>

        <tr
          v-for="dado in dadosCadastrados"
          :key="dado.id"
        >
          <td>
            {{ dado.nomeArquivo || dado.nome || 'Arquivo sem nome' }}
          </td>

          <td>
            {{ formatarData(dado.recebidoEm || dado.dataCadastro) }}
          </td>

          <td>
            <button
              type="button"
              class="botao-icone"
              aria-label="Visualizar arquivo"
              @click="visualizarDados(dado)"
            >
              <IconEye />
            </button>
          </td>

          <td>
            <button
              type="button"
              class="botao-icone"
              aria-label="Processar arquivo"
              :disabled="processando"
              @click="processarDados(dado)"
            >
              <IconProcess />
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <div
    v-if="mostrarModalVisualizacao"
    class="overlay"
  >
    <ModalVisualizacaoCSV
      :dados="dadosCSV"
      @fechar="mostrarModalVisualizacao = false"
    />
  </div>

  <div v-if="mostrarModal" class="overlay">
    <ModalProcessamento
      :concluido="processamentoConcluido"
      :erro="erroProcessamento"
      @finalizado="handleProcessamentoFinalizado"
      @fechar="fecharModalProcessamento"
    />
  </div>
</template>

<style scoped src="../assets/css/dados.css"></style>
