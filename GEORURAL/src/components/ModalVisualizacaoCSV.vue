<script setup>
defineProps({
  dados: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['fechar'])
</script>

<template>
  <div
    class="overlay"
    @click.self="emit('fechar')"
  >
    <div class="informacoes">
      <div class="titulo">
        <div>
          <h2>Dados do Arquivo</h2>
        </div>

        <button
          type="button"
          class="botao-fechar"
          aria-label="Fechar"
          @click="emit('fechar')"
        >
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

<style scoped src="../assets/css/modal.css"></style>
