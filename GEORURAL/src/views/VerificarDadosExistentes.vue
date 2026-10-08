<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import BarraNavegacao from '../components/BarraNavegacao.vue'
import IconProcess from '../components/icons/IconProcess.vue'
import ModalProcessamento from '../components/ModalProcessamento.vue'
import ModalVisualizacaoCSV from '../components/ModalVisualizacaoCSV.vue'
import { arquivoService } from '../services/arquivoService'

const router = useRouter()

const mostrarModal = ref(false)
const mostrarModalVisualizacao = ref(false)
const dadosCSV = ref([])

const dadosCadastrados = ref([])
const arquivoSelecionadoParaProcessar = ref(null)

const processamentoConcluido = ref(false)
const processamentoErro = ref(null)

const alertaProcessado = ref('')
const idEmProcessamento = ref(null)

const CHAVE_PROCESSADOS = 'georural-arquivos-processados'

function lerProcessados() {
  try {
    const valor = JSON.parse(
      localStorage.getItem(CHAVE_PROCESSADOS) || '[]'
    )

    return new Set(
      Array.isArray(valor) ? valor.map(String) : []
    )
  } catch {
    return new Set()
  }
}

const idsProcessados = ref(lerProcessados())

function arquivoProcessado(dado) {
  return idsProcessados.value.has(String(dado.id))
}

function formatarData(data) {
  if (!data) return '—'

  const partes = String(data).match(
    /^(\d{4})-(\d{2})-(\d{2})/
  )

  return partes
    ? `${partes[3]}/${partes[2]}/${partes[1]}`
    : '—'
}

onMounted(async () => {
  try {
    const dados = await arquivoService.listar()
    dadosCadastrados.value = dados
  } catch (error) {
    console.error('Erro ao carregar arquivos:', error)
  }
})

// async function visualizarDados(dado) {
//   try {
//     console.log('Arquivo selecionado:', dado)

//     const detalhe = await arquivoService.detalhe(dado.id)
//     console.log('Resposta do endpoint de detalhe:', detalhe)

//     dadosCSV.value = detalhe
//     mostrarModalVisualizacao.value = true
//   } catch (error) {
//     console.error('Erro ao buscar detalhes do arquivo:', error)
//   }
// }

async function processarDados(dado) {
  alertaProcessado.value = ''

  if (arquivoProcessado(dado)) {
    alertaProcessado.value = ''
    return
  }

  if (idEmProcessamento.value !== null) return

  idEmProcessamento.value = dado.id
  arquivoSelecionadoParaProcessar.value = dado.id
  processamentoConcluido.value = false
  processamentoErro.value = null
  mostrarModal.value = true

  try {
    await arquivoService.processar(dado.id)

    const atualizados = new Set(idsProcessados.value)
    atualizados.add(String(dado.id))

    localStorage.setItem(
      CHAVE_PROCESSADOS,
      JSON.stringify([...atualizados])
    )

    idsProcessados.value = atualizados
    processamentoConcluido.value = true
  } catch (error) {
    console.error('Erro ao processar:', error)

    processamentoErro.value =
      error.response?.data?.mensagem ||
      'Não foi possível processar o arquivo. Verifique o formato (shapefile .zip) e tente novamente.'
  } finally {
    idEmProcessamento.value = null
  }
}

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
          <th>Processar Arquivo</th>
          <th>Status do Processamento</th>
        </tr>
      </thead>

      <tbody>
        <tr v-if="dadosCadastrados.length === 0">
          <td colspan="5" class="vazio">
            Nenhum arquivo encontrado.
          </td>
        </tr>

        <tr
          v-for="dado in dadosCadastrados"
          :key="dado.id"
        >
          <td>{{ dado.nome }}</td>

          <td>{{ formatarData(dado.recebidoEm) }}</td>
          <td>
            <button
              type="button"
              class="botao-icone"
              :class="{
                'botao-processado': arquivoProcessado(dado),
              }"
              :aria-label="
                arquivoProcessado(dado)
                  ? 'Arquivo já processado'
                  : 'Processar arquivo'
              "
              :title="
                arquivoProcessado(dado)
                  ? 'Arquivo já processado'
                  : 'Processar arquivo'
              "
              @click="processarDados(dado)"
            >
              <IconProcess />
            </button>
          </td>

          <td>
            <span
              class="status"
              :class="
                arquivoProcessado(dado)
                  ? 'status-processado'
                  : 'status-aguardando'
              "
            >
              {{
                arquivoProcessado(dado)
                  ? 'Processado'
                  : 'Aguardando'
              }}
            </span>
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

  <div
    v-if="mostrarModal"
    class="overlay"
  >
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
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
}

.Conteudo {
  max-width: 900px;
  padding: 32px 24px 16px;
}

.Conteudo h3 {
  margin: 0 0 12px;
  color: #fff;
  font-family: 'Chakra Petch', sans-serif;
  font-size: 28px;
}

.Conteudo p {
  margin: 0 auto;
  color: #9ca3af;
  font-size: 16px;
  line-height: 1.5;
}

.Dados-Cadastrados {
  max-width: 900px;
  margin: 0 auto;
  padding: 32px 24px 16px;
}

.Dados-Cadastrados-Titulo {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  color: #fff;
  font-family: 'Chakra Petch', sans-serif;
}

.tabela-dados {
  width: 100%;
  border-collapse: collapse;
  overflow: hidden;
  border: 1px solid #b829f7;
  border-radius: 16px;
  background: #0a0a0f;
}

.tabela-dados th,
.tabela-dados td {
  padding: 12px;
  color: #fff;
  font-family: 'Chakra Petch', sans-serif;
  text-align: center;
}

.tabela-dados th {
  background: #1a1a22;
  font-weight: bold;
}

.tabela-dados tr:nth-child(even) {
  background: #1a1a22;
}

.botao-icone {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: none;
  background: none;
  cursor: pointer;
}

.botao-icone:hover {
  opacity: 0.7;
}

.botao-processado {
  opacity: 0.4;
  cursor: not-allowed;
}

.botao-processado:hover {
  opacity: 0.4;
}

.status {
  display: inline-block;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 12px;
}

.status-processado {
  background: rgba(74, 222, 128, 0.12);
  color: #4ade80;
}

.status-aguardando {
  background: rgba(250, 204, 21, 0.12);
  color: #facc15;
}

.alerta-processado {
  margin-bottom: 16px;
  padding: 12px;
  border: 1px solid #facc15;
  border-radius: 8px;
  background: #211b0b;
  color: #facc15;
}

.vazio {
  color: #9ca3af;
}
</style>
