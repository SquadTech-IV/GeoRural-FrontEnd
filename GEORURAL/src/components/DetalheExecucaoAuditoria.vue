<script setup>
import {
  onBeforeUnmount,
  ref,
  watch,
} from 'vue'

import {
  criarConsultaDetalheExecucao,
} from '../services/auditoriaDetalheExecucaoService'

const props = defineProps({
  dados: {
    type: Object,
    default: null,
  },
  execucaoId: {
    type: [String, Number],
    default: null,
  },
})

const emit = defineEmits(['erro'])

const aberto = ref(false)

const {
  detalhe,
  carregando,
  falhou,
  consultar,
  limpar,
  destruir,
} = criarConsultaDetalheExecucao()

async function carregar() {
  if (props.execucaoId == null) return

  try {
    await consultar(props.execucaoId, props.dados)
  } catch (erro) {
    emit(
      'erro',
      erro.message ||
        'Não foi possível consultar o detalhe da execução.',
    )
  }
}

function tratarAbertura(evento) {
  aberto.value = evento.target.open

  if (
    aberto.value &&
    !detalhe.value &&
    !carregando.value &&
    !falhou.value
  ) {
    carregar()
  }
}

watch(
  () => [props.execucaoId, props.dados],
  () => {
    limpar()

    if (aberto.value && props.execucaoId != null) {
      carregar()
    }
  },
)

onBeforeUnmount(destruir)
</script>

<template>
  <section
    class="detalhe-execucao"
    aria-labelledby="detalhe-execucao-titulo"
    :aria-busy="carregando"
  >
    <h3 id="detalhe-execucao-titulo">
      Detalhamento da execução
    </h3>

    <p
      v-if="execucaoId == null"
      class="detalhe-execucao-estado"
    >
      A execução não foi informada neste resultado.
    </p>

    <details
      v-else
      class="detalhe-execucao-painel"
      @toggle="tratarAbertura"
    >
      <summary>
        Consultar execução {{ execucaoId }}
      </summary>

      <div class="detalhe-execucao-conteudo">
        <p
          v-if="carregando"
          class="detalhe-execucao-estado"
          role="status"
        >
          Consultando detalhes da execução...
        </p>

        <div
          v-else-if="falhou"
          class="detalhe-execucao-estado"
        >
          <button
            type="button"
            class="detalhe-execucao-botao"
            @click="carregar"
          >
            Tentar novamente
          </button>
        </div>

        <template v-else-if="detalhe">
          <dl class="detalhe-execucao-campos">
            <div
              v-for="campo in detalhe.campos"
              :key="campo.chave"
            >
              <dt>{{ campo.titulo }}</dt>
              <dd>{{ campo.valor }}</dd>
            </div>
          </dl>

          <div
            v-if="detalhe.observacao"
            class="detalhe-execucao-observacao"
          >
            <h4>Informações da execução</h4>
            <p>{{ detalhe.observacao }}</p>
          </div>

          <button
            type="button"
            class="detalhe-execucao-botao"
            @click="carregar"
          >
            Atualizar detalhes
          </button>
        </template>
      </div>
    </details>
  </section>
</template>

<style scoped src="../assets/css/detalhe-execucao-auditoria.css"></style>
