<script setup>
import {
  onBeforeUnmount,
  watch,
} from 'vue'

import { RouterLink } from 'vue-router'

import {
  criarConsultaOrigensAuditoria,
} from '../services/auditoriaOrigemConsultaService'

const props = defineProps({
  resultadoId: {
    type: [String, Number],
    default: null,
  },
})

const emit = defineEmits(['erro'])

const {
  arquivos,
  carregando,
  consultado,
  consultar,
  limpar,
  destruir,
} = criarConsultaOrigensAuditoria()

async function carregar() {
  if (props.resultadoId == null) {
    limpar()
    return
  }

  try {
    await consultar(props.resultadoId)
  } catch (erro) {
    emit(
      'erro',
      erro.message ||
        'Não foi possível consultar os arquivos de origem.',
    )
  }
}

watch(
  () => props.resultadoId,
  carregar,
  { immediate: true },
)

onBeforeUnmount(destruir)
</script>

<template>
  <section
    class="origens-auditoria"
    aria-labelledby="origens-auditoria-titulo"
    :aria-busy="carregando"
  >
    <header class="origens-auditoria-cabecalho">
      <div>
        <h3 id="origens-auditoria-titulo">
          Arquivos de origem
        </h3>

        <p>
          Consulte os arquivos utilizados neste resultado.
        </p>
      </div>

      <button
        type="button"
        class="origens-auditoria-botao"
        :disabled="
          carregando ||
          resultadoId == null
        "
        @click="carregar"
      >
        Atualizar
      </button>
    </header>

    <p
      v-if="resultadoId == null"
      class="origens-auditoria-estado"
    >
      O resultado selecionado não possui um
      identificador válido para consultar sua origem.
    </p>

    <p
      v-else-if="carregando"
      class="origens-auditoria-estado"
      role="status"
    >
      Consultando arquivos de origem...
    </p>

    <template v-else-if="consultado">
      <p
        v-if="!arquivos.length"
        class="origens-auditoria-estado"
      >
        Nenhum arquivo de origem informado na linhagem.
      </p>

      <ul
        v-else
        class="origens-auditoria-lista"
      >
        <li
          v-for="arquivo in arquivos"
          :key="arquivo.chave"
          class="origens-auditoria-item"
        >
          <div class="origens-auditoria-dados">
            <strong>{{ arquivo.nome }}</strong>

            <span
              v-if="arquivo.hash"
              class="origens-auditoria-hash"
            >
              Hash: {{ arquivo.hash }}
            </span>
          </div>

          <RouterLink
            v-if="arquivo.destino"
            :to="arquivo.destino"
            class="origens-auditoria-botao"
            :aria-label="
              `Consultar arquivo ${arquivo.nome}`
            "
          >
            Consultar arquivo
          </RouterLink>

          <span
            v-else
            class="origens-auditoria-indisponivel"
          >
            Identificador não informado
          </span>
        </li>
      </ul>
    </template>
  </section>
</template>

<style scoped src="../assets/css/arquivos-origem-auditoria.css"></style>
