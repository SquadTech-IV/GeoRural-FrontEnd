<script setup>
import { onBeforeUnmount } from 'vue'

import BarraNavegacao from '../components/BarraNavegacao.vue'
import LinhaTempoZonas from '../components/LinhaTempoZonas.vue'
import DetalheMovimentacao from '../components/DetalheMovimentacao.vue'
import ToastMensagem from '../components/ToastMensagem.vue'

import {
  criarConsultaRastreabilidade,
} from '../services/rastreabilidadeConsultaService'

defineProps({
  conjuntos: {
    type: Array,
    default: () => [],
  },
})

const controle = criarConsultaRastreabilidade()

const {
  conjuntoId,
  trajetoria,
  carregando,
  falhou,
  feedback,
  detalheAberto,
  camposDetalhe,
  eventoSelecionado,
} = controle

onBeforeUnmount(controle.destruir)
</script>

<template>
  <BarraNavegacao />

  <main class="rastreabilidade-pagina">
    <header class="rastreabilidade-cabecalho">
      <div>
        <h1>Trajetória no datalake</h1>

        <p>
          Consulte a trajetória do conjunto e os eventos
          registrados nas zonas do Data Lake.
        </p>
      </div>
    </header>

    <div class="rastreabilidade-seletor">
      <label for="rastreabilidade-conjunto">
        Conjunto
      </label>

      <select
        id="rastreabilidade-conjunto"
        v-model="conjuntoId"
        :disabled="!conjuntos.length"
        @change="controle.consultar()"
      >
        <option value="" disabled>
          Selecione um conjunto
        </option>

        <option
          v-for="conjunto in conjuntos"
          :key="conjunto.id"
          :value="String(conjunto.id)"
        >
          {{ conjunto.nome }}
        </option>
      </select>

      <p
        v-if="!conjuntos.length"
        class="rastreabilidade-ajuda"
        role="status"
      >
        Nenhum conjunto disponível para seleção.
      </p>
    </div>

    <div
      v-if="carregando"
      class="rastreabilidade-estado"
      role="status"
    >
      Consultando trajetória...
    </div>

    <div
      v-else-if="falhou"
      class="rastreabilidade-estado"
    >
      <button
        type="button"
        class="rastreabilidade-botao"
        @click="controle.tentarNovamente()"
      >
        Tentar novamente
      </button>
    </div>

    <div
      v-else-if="trajetoria"
      class="rastreabilidade-colunas"
    >
      <section
        class="rastreabilidade-lista"
        aria-labelledby="titulo-eventos"
      >
        <h2
          id="titulo-eventos"
          class="rastreabilidade-lista-titulo"
        >
          Movimentações do conjunto
        </h2>

        <p
          v-if="!trajetoria.eventos.length"
          class="rastreabilidade-estado"
          role="status"
        >
          Nenhuma movimentação registrada.
        </p>

        <div v-else class="rastreabilidade-arquivos">
          <button
            v-for="evento in trajetoria.eventos"
            :key="evento.chave"
            type="button"
            class="rastreabilidade-arquivo"
            :class="{
              'rastreabilidade-arquivo--ativo':
                eventoSelecionado === evento.chave,
            }"
            :aria-pressed="
              eventoSelecionado === evento.chave
            "
            @click="controle.abrirEvento(evento.chave)"
          >
            <span class="rastreabilidade-arquivo-informacoes">
              <strong :title="evento.titulo">
                {{ evento.titulo }}
              </strong>

              <small>
                {{ evento.dataFormatada }}
              </small>
            </span>
          </button>
        </div>
      </section>

      <section
        class="rastreabilidade-detalhe"
        aria-labelledby="titulo-trajetoria"
      >
        <h2 id="titulo-trajetoria">
          {{ trajetoria.conjuntoNome }}
        </h2>

        <LinhaTempoZonas
          :trajetoria="trajetoria"
          @erro="controle.notificarErro"
        />
      </section>
    </div>

    <p v-else class="rastreabilidade-estado">
      Selecione um conjunto para consultar sua trajetória.
    </p>
  </main>

  <DetalheMovimentacao
    v-if="detalheAberto"
    :campos="camposDetalhe"
    @fechar="controle.fecharDetalhe"
  />

  <ToastMensagem
    v-if="feedback"
    :key="feedback.id"
    :mensagem="feedback.mensagem"
    :tipo="feedback.tipo"
    :duracao="0"
    @fechar="controle.fecharFeedback"
  />
</template>

<style scoped src="../assets/css/rastreabilidade.css"></style>
