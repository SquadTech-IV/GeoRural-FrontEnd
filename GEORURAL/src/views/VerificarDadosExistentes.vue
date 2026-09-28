<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import BarraNavegacao from '../components/BarraNavegacao.vue'
import IconEye from '../components/icons/IconEye.vue'
import IconProcess from '../components/icons/IconProcess.vue'
import ModalProcessamento from '../components/ModalProcessamento.vue'
import { arquivoService } from '../services/arquivoService'
import ModalVisualizacaoCSV from '../components/ModalVisualizacaoCSV.vue'

const router = useRouter()
const mostrarModal = ref(false)
const mostrarModalVisualizacao = ref(false)
const dadosCSV = ref([])

const dadosCadastrados = ref([])
const arquivoSelecionadoParaProcessar = ref(null)

// controle do modal de processamento
const processamentoConcluido = ref(false)
const processamentoErro = ref(null)

onMounted(async () => {
  try {
    const dados = await arquivoService.listar()
    dadosCadastrados.value = dados
  } catch (error) {
    console.error('Erro ao carregar arquivos', error)
  }
})

async function visualizarDados(dado) {
  try {
    console.log('Arquivo selecionado:', dado)

    const detalhe = await arquivoService.detalhe(dado.id)
    console.log('Resposta do endpoint de detalhe:', detalhe)

    dadosCSV.value = detalhe
    mostrarModalVisualizacao.value = true
  } catch (error) {
    console.error('Erro ao buscar detalhes do arquivo:', error)
  }
}

// clicar em processar: abre o modal E dispara o processamento
async function processarDados(dado) {
  arquivoSelecionadoParaProcessar.value = dado.id
  processamentoConcluido.value = false
  processamentoErro.value = null
  mostrarModal.value = true

  try {
    await arquivoService.processar(dado.id)
    // avisa o modal que terminou -> ele conclui a última etapa
    processamentoConcluido.value = true
  } catch (error) {
    console.error('Erro ao processar:', error)
    processamentoErro.value =
      error.response?.data?.mensagem ||
      'Não foi possível processar o arquivo. Verifique o formato (shapefile .zip) e tente novamente.'
  }
}

// o modal terminou a animação (após o backend responder) -> vai pra lista
function handleProcessamentoFinalizado() {
  mostrarModal.value = false
  router.push({ name: 'Imoveis' })
}

function fecharModalErro() {
  mostrarModal.value = false
}
</script>

<template>
  <BarraNavegacao />
  <div class="Conteudo">
    <h3>Verificar Dados Existentes</h3>
    <p>Verifique dados já existentes no sistema e os processos associados.</p>
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
          <td colspan="4" class="vazio">Nenhum arquivo encontrado.</td>
        </tr>
        <tr v-for="dado in dadosCadastrados" :key="dado.id">
          <td>{{ dado.nome }}</td>
          <td>{{ dado.recebidoEm }}</td>
          <td>
            <button class="botao-icone" @click="visualizarDados(dado)" aria-label="Visualizar arquivo">
              <IconEye />
            </button>
          </td>
          <td>
            <button class="botao-icone" aria-label="Processar arquivo" @click="processarDados(dado)">
              <IconProcess />
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <div v-if="mostrarModalVisualizacao" class="overlay">
    <ModalVisualizacaoCSV :dados="dadosCSV" @fechar="mostrarModalVisualizacao = false" />
  </div>

  <div v-if="mostrarModal" class="overlay">
    <ModalProcessamento
      :concluido="processamentoConcluido"
      :erro="processamentoErro"
      @finalizado="handleProcessamentoFinalizado"
      @fechar="fecharModalErro"
    />
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.Conteudo {
  padding: 32px 24px 16px;
  max-width: 900px;
}

.Conteudo h3 {
  font-size: 28px;
  color: #fff;
  margin: 0 0 12px;
  font-family: 'Chakra Petch', sans-serif;
}

.Conteudo p {
  color: #9ca3af;
  font-size: 16px;
  line-height: 1.5;
  margin: 0 auto;
  white-space: nowrap;
}

.Dados-Cadastrados {
  padding: 32px 24px 16px;
  max-width: 900px;
  margin: 0 auto;
}

.Dados-Cadastrados-Titulo {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.tabela-dados {
  width: 100%;
  border-collapse: collapse;
  background: #0a0a0f;
  border: 1px solid #b829f7;
  border-radius: 16px;
  overflow: hidden;
  align-items: center;
}
.tabela-dados th,
.tabela-dados td {
  padding: 12px;
  text-align: center;
  color: #fff;
  font-family: 'Chakra Petch', sans-serif;
}
.tabela-dados th {
  background: #1a1a22;
  font-weight: bold;
}
.tabela-dados tr:nth-child(even) {
  background: #1a1a22;
}

.tabela-dados td:nth-child(3),
.tabela-dados td:nth-child(4) {
  text-align: center;
}

.botao-icone {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.botao-icone:hover {
  opacity: 0.7;
}
</style>
