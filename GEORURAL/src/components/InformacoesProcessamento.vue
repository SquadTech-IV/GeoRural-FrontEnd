<script setup>
import {
  onBeforeUnmount,
  watch,
} from 'vue'

import {
  criarConsultaProcessamentoTratada,
} from '../services/zonaTratadaProcessamentoService'

const props = defineProps({
  execucaoId: {
    type: [String, Number],
    default: null,
  },
})

const emit = defineEmits(['erro'])

const {
  processamento,
  carregando,
  falhou,
  consultar,
  limpar,
  destruir,
} = criarConsultaProcessamentoTratada()

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
        'Não foi possível consultar o processamento.',
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
    class="tratada-processamento"
    aria-labelledby="tratada-processamento-titulo"
    :aria-busy="carregando"
  >
    <header class="tratada-processamento-cabecalho">
      <div>
        <h3 id="tratada-processamento-titulo">
          Informações do processamento
        </h3>

        <p v-if="execucaoId != null">
          Execução {{ execucaoId }}
        </p>
      </div>

      <button
        type="button"
        class="tratada-processamento-botao"
        :disabled="
          carregando ||
          execucaoId == null
        "
        @click="carregar"
      >
        {{
          carregando
            ? 'Consultando...'
            : 'Atualizar informações'
        }}
      </button>
    </header>

    <p
      v-if="execucaoId == null"
      class="tratada-processamento-estado"
    >
      A execução não foi informada para este conjunto.
    </p>

    <p
      v-else-if="carregando"
      class="tratada-processamento-estado"
      role="status"
    >
      Consultando informações do processamento...
    </p>

    <div
      v-else-if="falhou"
      class="tratada-processamento-estado"
    >
      <button
        type="button"
        class="tratada-processamento-botao"
        @click="carregar"
      >
        Tentar novamente
      </button>
    </div>

    <template v-else-if="processamento">
      <dl class="tratada-processamento-campos">
        <div
          v-for="campo in processamento.campos"
          :key="campo.chave"
        >
          <dt>{{ campo.titulo }}</dt>
          <dd>{{ campo.valor }}</dd>
        </div>
      </dl>

      <section
        v-if="processamento.observacao"
        class="tratada-processamento-observacao"
        aria-labelledby="tratada-processamento-observacao-titulo"
      >
        <h4 id="tratada-processamento-observacao-titulo">
          Observações
        </h4>

        <p>{{ processamento.observacao }}</p>
      </section>
    </template>
  </section>
</template>

<style scoped src="../assets/css/informacoes-processamento.css"></style>
