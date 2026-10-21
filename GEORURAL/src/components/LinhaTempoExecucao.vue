<script setup>
import {
  onBeforeUnmount,
  watch,
} from 'vue'

import {
  criarConsultaLinhaTempo,
} from '../services/auditoriaLinhaTempoService'

const props = defineProps({
  execucaoId: {
    type: [String, Number],
    default: null,
  },
})

const emit = defineEmits(['erro'])

const {
  eventos,
  carregando,
  consultado,
  falhou,
  consultar,
  limpar,
  destruir,
} = criarConsultaLinhaTempo()

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
        'Não foi possível consultar a linha do tempo.',
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
    class="execucao-linha-tempo"
    aria-labelledby="execucao-linha-tempo-titulo"
    :aria-busy="carregando"
  >
    <header class="execucao-linha-tempo-cabecalho">
      <div>
        <h3 id="execucao-linha-tempo-titulo">
          Linha do tempo da execução
        </h3>

        <p v-if="execucaoId != null">
          Execução {{ execucaoId }}
        </p>
      </div>

      <button
        type="button"
        class="execucao-linha-tempo-botao"
        :disabled="
          carregando ||
          execucaoId == null
        "
        @click="carregar"
      >
        {{
          carregando
            ? 'Consultando...'
            : 'Atualizar'
        }}
      </button>
    </header>

    <p
      v-if="execucaoId == null"
      class="execucao-linha-tempo-estado"
    >
      A execução não foi informada neste resultado.
    </p>

    <p
      v-else-if="carregando"
      class="execucao-linha-tempo-estado"
      role="status"
    >
      Consultando a linha do tempo...
    </p>

    <div
      v-else-if="falhou"
      class="execucao-linha-tempo-estado"
    >
      <button
        type="button"
        class="execucao-linha-tempo-botao"
        @click="carregar"
      >
        Tentar novamente
      </button>
    </div>

    <template v-else-if="consultado">
      <p
        v-if="!eventos.length"
        class="execucao-linha-tempo-estado"
      >
        Nenhum evento informado para esta execução.
      </p>

      <ol
        v-else
        class="execucao-linha-tempo-lista"
      >
        <li
          v-for="evento in eventos"
          :key="evento.chave"
          class="execucao-linha-tempo-item"
          :class="
            `execucao-linha-tempo-item--${evento.classe}`
          "
        >
          <span
            class="execucao-linha-tempo-marcador"
            aria-hidden="true"
          />

          <div class="execucao-linha-tempo-conteudo">
            <div class="execucao-linha-tempo-evento">
              <h4>{{ evento.titulo }}</h4>

              <span class="execucao-linha-tempo-situacao">
                {{ evento.situacao }}
              </span>
            </div>

            <p
              v-if="evento.descricao"
              class="execucao-linha-tempo-descricao"
            >
              {{ evento.descricao }}
            </p>

            <dl class="execucao-linha-tempo-datas">
              <div>
                <dt>Início</dt>
                <dd>{{ evento.inicio }}</dd>
              </div>

              <div v-if="evento.fim">
                <dt>Fim</dt>
                <dd>{{ evento.fim }}</dd>
              </div>
            </dl>
          </div>
        </li>
      </ol>
    </template>
  </section>
</template>

<style scoped src="../assets/css/linha-tempo-execucao.css"></style>
