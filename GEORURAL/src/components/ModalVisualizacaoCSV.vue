<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  nomeArquivo: {
    type: String,
    default: '',
  },
  camadas: {
    type: Array,
    default: () => [],
  },
  carregando: {
    type: Boolean,
    default: false,
  },
  erro: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['fechar'])

const camadaSelecionada = ref(0)
const LIMITE_PREVIA = 100

watch(
  () => props.camadas,
  () => {
    camadaSelecionada.value = 0
  },
)

const camadaAtual = computed(
  () => props.camadas[camadaSelecionada.value] || null,
)

const registros = computed(
  () => camadaAtual.value?.registros || [],
)

const colunas = computed(() => [
  ...new Set(
    registros.value.flatMap((registro) => Object.keys(registro)),
  ),
])

const registrosVisiveis = computed(
  () => registros.value.slice(0, LIMITE_PREVIA),
)

function formatarValor(valor) {
  if (valor == null || valor === '') return '—'

  if (typeof valor === 'object') {
    return JSON.stringify(valor)
  }

  return String(valor)
}
</script>

<template>
  <div
    class="overlay"
    @click.self="emit('fechar')"
  >
    <div
      class="informacoes"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-modal-arquivo"
    >
      <div class="titulo">
        <div>
          <h2 id="titulo-modal-arquivo">
            Dados do arquivo
          </h2>

          <p class="nome-arquivo">
            {{ nomeArquivo }}
          </p>
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

      <p v-if="carregando" class="estado">
        Baixando e lendo o arquivo...
      </p>

      <p v-else-if="erro" class="estado erro">
        {{ erro }}
      </p>

      <p v-else-if="camadas.length === 0" class="estado">
        Nenhuma camada encontrada no arquivo.
      </p>

      <template v-else>
        <label
          v-if="camadas.length > 1"
          class="seletor"
        >
          Camada

          <select v-model.number="camadaSelecionada">
            <option
              v-for="(camada, index) in camadas"
              :key="index"
              :value="index"
            >
              {{ camada.nome }}
            </option>
          </select>
        </label>

        <p class="resumo">
          {{ camadaAtual.nome }} —
          {{ registros.length }} registro(s)
        </p>

        <p
          v-if="registros.length === 0"
          class="estado"
        >
          Esta camada não possui registros para exibir.
        </p>

        <template v-else>
          <p
            v-if="registros.length > LIMITE_PREVIA"
            class="aviso"
          >
            Exibindo os primeiros {{ LIMITE_PREVIA }} registros.
          </p>

          <div class="tabela-container">
            <table class="tabela-csv">
              <thead>
                <tr>
                  <th
                    v-for="coluna in colunas"
                    :key="coluna"
                  >
                    {{ coluna }}
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="(registro, index) in registrosVisiveis"
                  :key="index"
                >
                  <td
                    v-for="coluna in colunas"
                    :key="coluna"
                  >
                    {{ formatarValor(registro[coluna]) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </template>
    </div>
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
  padding: 16px;
  background: rgba(0, 0, 0, 0.65);
}

.informacoes {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 1100px;
  max-height: 80vh;
  padding: 24px;
  border-radius: 16px;
  background: #0a0a0f;
  box-shadow: 0 0 30px rgba(184, 41, 247, 0.25);
}

.titulo {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.titulo h2 {
  margin: 0 0 6px;
  color: #fff;
  font-family: 'Chakra Petch', sans-serif;
  font-size: 24px;
}

.nome-arquivo {
  margin: 0;
  color: #9ca3af;
  overflow-wrap: anywhere;
}

.botao-fechar {
  border: none;
  background: transparent;
  color: #fff;
  font-size: 30px;
  line-height: 1;
  cursor: pointer;
}

.botao-fechar:hover {
  color: #b829f7;
}

.estado {
  margin: 0;
  padding: 32px;
  color: #9ca3af;
  font-family: 'Chakra Petch', sans-serif;
  text-align: center;
}

.estado.erro {
  color: #f87171;
}

.seletor {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  color: #fff;
}

.seletor select {
  max-width: 100%;
  padding: 8px;
  border: 1px solid #b829f7;
  border-radius: 6px;
  background: #1a1a22;
  color: #fff;
}

.resumo,
.aviso {
  margin: 0 0 12px;
  color: #9ca3af;
  font-size: 13px;
}

.tabela-container {
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
  color: #fff;
  text-align: left;
  white-space: nowrap;
}

.tabela-csv th {
  position: sticky;
  top: 0;
  background: #1a1a22;
  color: #b829f7;
}

.tabela-csv tbody tr:nth-child(even) {
  background: #111118;
}

.tabela-csv tbody tr:hover {
  background: #1d1722;
}
</style>
