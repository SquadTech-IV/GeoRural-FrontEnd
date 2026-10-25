<script setup>
import {
  onBeforeUnmount,
  watch,
} from 'vue'

import {
  criarConsultaHistoricoTratada,
} from '../services/zonaTratadaHistoricoService'

const props = defineProps({
  execucaoId: {
    type: [String, Number],
    default: null,
  },
})

const emit = defineEmits(['erro'])

const {
  transformacoes,
  carregando,
  consultado,
  falhou,
  listaParcial,
  consultar,
  limpar,
  destruir,
} = criarConsultaHistoricoTratada()

async function carregar() {
  if (props.execucaoId == null) {
    limpar()
    return
  }

  try {
    await consultar(props.execucaoId)
  } catch (erro) {
    emit(
      'erro',
      erro.message ||
        'Não foi possível consultar as transformações.',
    )
  }
}

watch(
  () => props.execucaoId,
  carregar,
  { immediate: true },
)

onBeforeUnmount(destruir)
</script>

<template>
  <section
    class="tratada-historico"
    aria-labelledby="tratada-historico-titulo"
    :aria-busy="carregando"
  >
    <header class="tratada-historico-cabecalho">
      <div>
        <h3 id="tratada-historico-titulo">
          Histórico das transformações
        </h3>

        <p v-if="execucaoId != null">
          Execução {{ execucaoId }}
        </p>
      </div>

      <button
        type="button"
        class="tratada-historico-botao"
        :disabled="
          carregando ||
          execucaoId == null
        "
        @click="carregar"
      >
        {{
          carregando
            ? 'Consultando...'
            : 'Atualizar histórico'
        }}
      </button>
    </header>

    <p
      v-if="execucaoId == null"
      class="tratada-historico-estado"
    >
      A execução não foi informada para este conjunto.
    </p>

    <p
      v-else-if="carregando"
      class="tratada-historico-estado"
      role="status"
    >
      Consultando transformações...
    </p>

    <div
      v-else-if="falhou"
      class="tratada-historico-estado"
    >
      <button
        type="button"
        class="tratada-historico-botao"
        @click="carregar"
      >
        Tentar novamente
      </button>
    </div>

    <template v-else-if="consultado">
      <p
        v-if="listaParcial"
        class="tratada-historico-ajuda"
      >
        A API retornou uma página do histórico.
        São exibidas somente as transformações carregadas.
      </p>

      <p
        v-if="!transformacoes.length"
        class="tratada-historico-estado"
      >
        Nenhuma transformação informada para esta execução.
      </p>

      <ol
        v-else
        class="tratada-historico-lista"
      >
        <li
          v-for="transformacao in transformacoes"
          :key="transformacao.chave"
          class="tratada-historico-item"
        >
          <span
            class="tratada-historico-marcador"
            aria-hidden="true"
          />

          <div class="tratada-historico-conteudo">
            <header class="tratada-historico-evento">
              <h4>{{ transformacao.titulo }}</h4>

              <span class="tratada-historico-situacao">
                {{ transformacao.situacao }}
              </span>
            </header>

            <p
              v-if="transformacao.descricao"
              class="tratada-historico-descricao"
            >
              {{ transformacao.descricao }}
            </p>

            <p class="tratada-historico-data">
              Data: {{ transformacao.data }}
            </p>
          </div>
        </li>
      </ol>
    </template>
  </section>
</template>

<style scoped src="../assets/css/historico-transformacoes.css"></style>
