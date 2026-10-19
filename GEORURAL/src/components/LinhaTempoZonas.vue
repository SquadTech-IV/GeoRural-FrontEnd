<script setup>
import { computed, watch } from 'vue'

import {
  prepararLinhaTempo,
} from '../services/linhaTempoZonasService'

const props = defineProps({
  trajetoria: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['erro'])

const linhaTempo = computed(() =>
  prepararLinhaTempo(props.trajetoria),
)

watch(
  () => linhaTempo.value.erro,
  (mensagem) => {
    if (mensagem) {
      emit('erro', mensagem)
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="linha-tempo">
    <template v-if="!linhaTempo.erro">
      <div
        v-if="linhaTempo.zonaAtual"
        class="linha-tempo-atual"
      >
        <span>Zona atual:</span>

        <span
          class="linha-tempo-zona"
          :class="`linha-tempo-zona--${linhaTempo.zonaAtual.codigo}`"
        >
          {{ linhaTempo.zonaAtual.nome }}
        </span>

        <span v-if="linhaTempo.emAndamento">
          Em andamento
        </span>
      </div>

      <p
        v-if="!linhaTempo.possuiMovimentacoes"
        class="linha-tempo-vazia"
        role="status"
      >
        Este arquivo ainda não possui movimentações registradas.
      </p>

      <ol
        v-if="linhaTempo.etapas.length"
        class="linha-tempo-etapas"
        aria-label="Passagens pelas zonas do Data Lake"
      >
        <li
          v-for="etapa in linhaTempo.etapas"
          :key="etapa.zona"
          class="linha-tempo-etapa"
          :class="`linha-tempo-etapa--${etapa.status}`"
        >
          <div
            class="linha-tempo-trilho"
            aria-hidden="true"
          >
            <span class="linha-tempo-no">
              <span
                v-if="etapa.emAndamento"
                class="linha-tempo-pulso"
              ></span>

              <template v-else>
                {{ etapa.icone }}
              </template>
            </span>

            <span
              class="linha-tempo-conexao"
              :class="{
                'linha-tempo-conexao--concluida':
                  etapa.concluida,
              }"
            ></span>
          </div>

          <div class="linha-tempo-conteudo">
            <div class="linha-tempo-titulo">
              <h3>{{ etapa.nome }}</h3>

              <span class="linha-tempo-situacao">
                {{ etapa.situacao }}
              </span>
            </div>

            <p
              v-if="etapa.quando"
              class="linha-tempo-data"
            >
              {{ etapa.quando }}
            </p>

            <p
              v-if="etapa.contagem"
              class="linha-tempo-contagem"
            >
              {{ etapa.contagem }}
            </p>

            <p
              v-if="etapa.observacao"
              class="linha-tempo-observacao"
            >
              {{ etapa.observacao }}
            </p>

            <p
              v-else-if="etapa.pendente"
              class="linha-tempo-observacao linha-tempo-observacao--pendente"
            >
              Ainda não chegou nesta zona.
            </p>
          </div>
        </li>
      </ol>
    </template>
  </div>
</template>

<style scoped src="../assets/css/linha-tempo-zonas.css"></style>
