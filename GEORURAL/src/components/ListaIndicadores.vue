<script setup>
import { computed } from 'vue'
import { agruparIndicadores } from '../services/regraService'

const props = defineProps({
  indicadores: {
    type: Array,
    default: () => [],
  },
  selecionadoId: {
    type: [String, Number],
    default: null,
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

const emit = defineEmits(['selecionar', 'tentar-novamente'])

const grupos = computed(() => agruparIndicadores(props.indicadores))

function estaSelecionado(indicador) {
  return indicador.id === props.selecionadoId
}

function selecionar(indicador) {
  emit('selecionar', indicador)
}
</script>

<template>
  <aside class="indicadores-lista" aria-label="Lista de indicadores" :aria-busy="carregando">
    <div v-if="carregando" class="indicadores-estado" role="status">
      <span class="indicadores-spinner" aria-hidden="true"></span>

      <p>Carregando indicadores...</p>
    </div>

    <div v-else-if="erro" class="indicadores-estado indicadores-estado--erro" role="alert">
      <p>{{ erro }}</p>

      <button type="button" class="indicadores-recarregar" @click="emit('tentar-novamente')">
        Tentar novamente
      </button>
    </div>

    <template v-else>
      <section
        v-for="grupo in grupos"
        :key="grupo.id"
        class="indicadores-grupo"
        :aria-labelledby="`titulo-grupo-${grupo.id}`"
      >
        <header class="indicadores-grupo-cabecalho">
          <h2 :id="`titulo-grupo-${grupo.id}`">
            {{ grupo.titulo }}
          </h2>

          <p>{{ grupo.descricao }}</p>

          <span class="indicadores-contagem">
            {{ grupo.indicadores.length }}
            {{ grupo.indicadores.length === 1 ? 'indicador' : 'indicadores' }}
          </span>
        </header>

        <p v-if="!grupo.indicadores.length" class="indicadores-vazio">
          Nenhum indicador disponível neste grupo.
        </p>

        <ul v-else class="indicadores-itens">
          <li v-for="indicador in grupo.indicadores" :key="indicador.id">
            <button
              type="button"
              class="indicadores-item"
              :class="{
                'indicadores-item--ativo': estaSelecionado(indicador),
              }"
              :aria-pressed="estaSelecionado(indicador)"
              @click="selecionar(indicador)"
            >
              <span class="indicadores-item-titulo">
                <span v-if="indicador.codigo">
                  {{ indicador.codigo }}
                </span>

                <span v-if="indicador.codigo && indicador.nome" aria-hidden="true"> · </span>

                <span>{{ indicador.nome }}</span>
              </span>

              <span v-if="indicador.descricao" class="indicadores-item-descricao">
                {{ indicador.descricao }}
              </span>

              <span
                v-if="indicador.versaoVigente != null || indicador.parametros?.length"
                class="indicadores-item-metadados"
              >
                <span v-if="indicador.versaoVigente != null">
                  Versão vigente:
                  {{ indicador.versaoVigente }}
                </span>

                <span v-if="indicador.parametros?.length">
                  {{ indicador.parametros.length }}
                  {{ indicador.parametros.length === 1 ? 'parâmetro' : 'parâmetros' }}
                </span>
              </span>
            </button>
          </li>
        </ul>
      </section>
    </template>
  </aside>
</template>

<style scoped src="../assets/css/indicadores.css"></style>
