<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import BarraNavegacao from '../components/BarraNavegacao.vue'
import IconEye from '../components/icons/IconEye.vue'
import IconProcess from '../components/icons/IconProcess.vue'
import ModalProcessamento from '../components/ModalProcessamento.vue'

const router = useRouter()
const mostrarModal = ref(false)

const dadosCadastrados = ref([
  {
    id: 1,
    nome: 'CAR',
    dataCadastro: '13-09-2026',
  },
])

function visualizarDados(dado) {
  console.log('Visualizar:', dado)
}

function processarDados() {
  mostrarModal.value = true
}

function handleProcessamentoFinalizado() {
  mostrarModal.value = false
  router.push({ name: 'Resultado' })
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
        <tr v-for="dado in dadosCadastrados" :key="dado.id">
          <td>{{ dado.nome }}</td>
          <td>{{ dado.dataCadastro }}</td>
          <td>
            <button class="botao-icone" @click="visualizarDados(dado)" aria-label="Visualizar arquivo">
              <IconEye />
            </button>
          </td>
          <td>
            <button class="botao-icone" @click="processarDados" aria-label="Processar arquivo">
              <IconProcess />
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <div v-if="mostrarModal" class="overlay">
    <ModalProcessamento @finalizado="handleProcessamentoFinalizado" />
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
