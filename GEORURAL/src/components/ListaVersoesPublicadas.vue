<script setup>
import { computed } from 'vue'

import {
  prepararVersoesPublicadas,
} from '../services/versoesPublicadasService'

const props = defineProps({
  titulo: {
    type: String,
    default: 'Versões publicadas',
  },
  descricao: {
    type: String,
    default:
      'Consulte as versões publicadas.',
  },
  mensagemVazia: {
    type: String,
    default: 'Nenhuma versão disponível.',
  },
  versoes: {
    type: Array,
    default: () => [],
  },
  carregando: {
    type: Boolean,
    default: false,
  },
})

const versoesExibidas = computed(() =>
  prepararVersoesPublicadas(props.versoes),
)
</script>

<template>
  <section
    class="versoes-card"
    aria-labelledby="versoes-publicadas-titulo"
    :aria-busy="carregando"
  >
    <header class="versoes-cabecalho">
      <div>
        <h2 id="versoes-publicadas-titulo">
          {{ titulo }}
        </h2>

        <p>{{ descricao }}</p>
      </div>

      <span
        v-if="!carregando"
        class="versoes-contador"
      >
        {{ versoesExibidas.length }}
        {{
          versoesExibidas.length === 1
            ? 'versão'
            : 'versões'
        }}
      </span>
    </header>

    <p
      v-if="carregando"
      class="versoes-estado"
      role="status"
    >
      Carregando versões publicadas...
    </p>

    <div
      v-else-if="!versoesExibidas.length"
      class="versoes-estado"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M3 7h7l2 2h9v11H3z" />
        <path d="M3 7V4h7l2 3" />
      </svg>

      <strong>{{ mensagemVazia }}</strong>
      <p>{{ descricao }}</p>
    </div>

    <div
      v-else
      class="versoes-tabela-container"
      role="region"
      :aria-label="titulo"
      tabindex="0"
    >
      <table class="versoes-tabela">
        <caption class="versoes-somente-leitor">
          Versões, competências e datas de publicação
        </caption>

        <thead>
          <tr>
            <th scope="col">Versão</th>
            <th scope="col">Competência</th>
            <th scope="col">Publicada em</th>
            <th scope="col">Situação no retorno</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="versao in versoesExibidas"
            :key="versao.chave"
          >
            <th scope="row">
              {{ versao.numero }}
            </th>

            <td>{{ versao.competencia }}</td>

            <td class="versoes-data">
              {{ versao.dataPublicacao }}
            </td>

            <td>
              <span
                class="versoes-situacao"
                :class="
                  `versoes-situacao--${versao.situacao.classe}`
                "
              >
                {{ versao.situacao.texto }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped src="../assets/css/lista-versoes-publicadas.css"></style>
