<script setup>
defineProps({
  dados: {
    type: Array,
    default: () => []
  }
})
const emit = defineEmits(['fechar'])
</script>

<template>
  <div class="overlay" @click.self="emit('fechar')">

    <div class="informacoes">
      <div class="titulo">
        <div>
          <h2>Dados do Arquivo</h2>
        </div>

        <button
          class="botao-fechar"
          @click="emit('fechar')"
          aria-label="Fechar">
          ×
        </button>
      </div>

      <div v-if="dados.length === 0" class="vazio">
        Nenhum dado encontrado neste arquivo.
      </div>

      <div v-else class="tabela">
        <table class="tabela-informacoes">
          <thead>
            <tr>
              <th
                v-for="coluna in Object.keys(dados[0])"
                :key="coluna"
              >
                {{ coluna }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(linha, index) in dados"
              :key="index"
            >
              <td
                v-for="coluna in Object.keys(dados[0])"
                :key="coluna"
              >
                {{ linha[coluna] }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.informacoes {
  width: 90%;
  max-width: 1100px;
  max-height: 80vh;
  background: #0a0a0f;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 0 30px rgba(184, 41, 247, 0.25);
  display: flex;
  flex-direction: column;
}

.titulo {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
}

.titulo h2 {
  margin: 0 0 6px;
  color: #fff;
  font-family: 'Chakra Petch', sans-serif;
  font-size: 24px;
}

.botao-fechar {
  background: transparent;
  border: none;
  color: #fff;
  font-size: 30px;
  line-height: 1;
  cursor: pointer;
}

.botao-fechar:hover {
  color: #b829f7;
}

.tabela-container {
  max-height: 55vh;
  overflow: auto;
  border: 1px solid #2b2b35;
  border-radius: 10px;
}

.tabela-csv {
  width: 100%;
  border-collapse: collapse;
  font-family: 'Chakra Petch', sans-serif;
}

.tabela-csv th,
.tabela-csv td {
  padding: 12px 16px;
  border-bottom: 1px solid #2b2b35;
  text-align: left;
  white-space: nowrap;
}

.tabela-csv th {
  position: sticky;
  top: 0;
  background: #1a1a22;
  color: #b829f7;
  font-weight: bold;
}

.tabela-csv td {
  color: #fff;
}

.tabela-csv tr:nth-child(even) {
  background: #111118;
}

.tabela-csv tr:hover {
  background: #1d1722;
}

.vazio {
  padding: 40px;
  color: #9ca3af;
  text-align: center;
  font-family: 'Chakra Petch', sans-serif;
}

</style>
