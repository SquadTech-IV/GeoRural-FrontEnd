<script setup>
import { onBeforeUnmount, onMounted } from 'vue'

import BarraNavegacao from '../components/BarraNavegacao.vue'
import ListaArquivosConjunto from '../components/ListaArquivosConjunto.vue'
import LinhaTempoZonas from '../components/LinhaTempoZonas.vue'
import DetalheMovimentacao from '../components/DetalheMovimentacao.vue'
import ToastMensagem from '../components/ToastMensagem.vue'

import {
  criarConsultaRastreabilidade,
} from '../services/rastreabilidadeConsultaService'

const controle = criarConsultaRastreabilidade()

const {
  conjuntos,
  conjuntoId,
  arquivoId,
  arquivos,
  trajetoria,
  carregandoConjuntos,
  carregando,
  falhouConjuntos,
  falhou,
  feedback,
  detalheAberto,
  camposDetalhe,
  eventoSelecionado,
} = controle

onMounted(controle.carregarConjuntos)
onBeforeUnmount(controle.destruir)
</script>

<template>
  <BarraNavegacao />

  <main class="rastreabilidade-pagina">
    <header class="rastreabilidade-cabecalho">
      <div>
        <h1>Trajetória no datalake</h1>

        <p>
          Selecione o conjunto e consulte as passagens
          de cada arquivo pelas zonas do Data Lake.
        </p>
      </div>
    </header>

    <div class="rastreabilidade-seletor">
      <label for="rastreabilidade-conjunto">Conjunto</label>

      <select
        id="rastreabilidade-conjunto"
        v-model="conjuntoId"
        :disabled="carregandoConjuntos || !conjuntos.length"
        @change="controle.consultar()"
      >
        <option value="" disabled>Selecione um conjunto</option>

        <option
          v-for="conjunto in conjuntos"
          :key="conjunto.id"
          :value="conjunto.id"
        >
          {{ conjunto.nome }}
        </option>
      </select>

      <p
        v-if="carregandoConjuntos"
        class="rastreabilidade-ajuda"
        role="status"
      >
        Carregando conjuntos...
      </p>

      <button
        v-else-if="falhouConjuntos"
        type="button"
        class="rastreabilidade-botao"
        @click="controle.carregarConjuntos"
      >
        Tentar carregar conjuntos novamente
      </button>

      <p
        v-else-if="!conjuntos.length"
        class="rastreabilidade-ajuda"
        role="status"
      >
        Nenhum conjunto disponível para seleção.
      </p>
    </div>

    <div class="rastreabilidade-colunas">
      <ListaArquivosConjunto
        :arquivos="arquivos"
        :selecionado="arquivoId"
        :carregando="carregando"
        :falhou="falhou"
        :possui-conjunto="Boolean(conjuntoId)"
        @selecionar="controle.selecionarArquivo"
        @tentar-novamente="controle.tentarNovamente"
      />

      <section
        class="rastreabilidade-detalhe"
        aria-labelledby="titulo-trajetoria"
      >
        <template v-if="trajetoria">
          <h2 id="titulo-trajetoria">{{ trajetoria.nome }}</h2>

          <p class="rastreabilidade-ajuda">
            {{ trajetoria.conjuntoNome }}
          </p>

          <LinhaTempoZonas
            :trajetoria="trajetoria"
            @erro="controle.notificarErro"
          />

          <h3 class="rastreabilidade-lista-titulo">
            Passagens registradas
          </h3>

          <p
            v-if="!trajetoria.eventos.length"
            class="rastreabilidade-estado"
            role="status"
          >
            Nenhuma passagem registrada para este arquivo.
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
              :aria-pressed="eventoSelecionado === evento.chave"
              @click="controle.abrirEvento(evento.chave)"
            >
              <span class="rastreabilidade-arquivo-informacoes">
                <strong>{{ evento.titulo }}</strong>
                <small>{{ evento.dataFormatada }}</small>
              </span>
            </button>
          </div>

          <p class="rastreabilidade-ajuda">
            A consulta apresenta a última passagem registrada
            em cada zona para o arquivo selecionado.
          </p>
        </template>

        <p v-else class="rastreabilidade-estado">
          {{
            carregando
              ? 'Consultando trajetória...'
              : 'Selecione um arquivo para consultar sua trajetória.'
          }}
        </p>
      </section>
    </div>
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
