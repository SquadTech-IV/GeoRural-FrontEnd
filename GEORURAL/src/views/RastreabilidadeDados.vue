<script setup>
import { onBeforeUnmount, onMounted } from 'vue'

import BarraNavegacao from '../components/BarraNavegacao.vue'
import ListaArquivosConjunto from '../components/ListaArquivosConjunto.vue'
import ToastMensagem from '../components/ToastMensagem.vue'

import {
  criarConsultaRastreabilidade,
} from '../services/rastreabilidadeConsultaService'

const controle = criarConsultaRastreabilidade()

const {
  conjuntos,
  arquivos,
  trajetoria,
  conjuntoId,
  arquivoId,
  conjuntoSelecionado,
  arquivoSelecionado,
  carregandoConjuntos,
  carregandoArquivos,
  carregandoTrajetoria,
  erroConjuntos,
  erroArquivos,
  erroTrajetoria,
  feedback,
} = controle

onMounted(() => {
  controle.carregarConjuntos()
})

onBeforeUnmount(controle.destruir)
</script>

<template>
  <BarraNavegacao />

  <main class="rastreabilidade-pagina">
    <header class="rastreabilidade-cabecalho">
      <div>
        <h1>Trajetória no datalake</h1>

        <p>
          Consulte os arquivos de cada conjunto e acompanhe
          sua trajetória pelas zonas do Data Lake.
        </p>
      </div>
    </header>

    <div class="rastreabilidade-seletor">
      <label for="rastreabilidade-conjunto">
        Conjunto
      </label>

      <select
        id="rastreabilidade-conjunto"
        :value="conjuntoId"
        :disabled="carregandoConjuntos || !conjuntos.length"
        @change="
          controle.selecionarConjunto($event.target.value)
        "
      >
        <option value="">
          {{
            carregandoConjuntos
              ? 'Carregando conjuntos...'
              : 'Selecione um conjunto'
          }}
        </option>

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
        Aguarde enquanto os conjuntos são consultados.
      </p>

      <button
        v-else-if="erroConjuntos"
        type="button"
        class="rastreabilidade-botao"
        @click="controle.carregarConjuntos()"
      >
        Tentar novamente
      </button>

      <p
        v-else-if="!conjuntos.length"
        class="rastreabilidade-ajuda"
        role="status"
      >
        Nenhum conjunto disponível para consulta.
      </p>
    </div>

    <div class="rastreabilidade-colunas">
      <ListaArquivosConjunto
        :arquivos="arquivos"
        :selecionado="arquivoId"
        :carregando="carregandoArquivos"
        :falhou="erroArquivos"
        :possui-conjunto="Boolean(conjuntoSelecionado)"
        @selecionar="controle.selecionarArquivo"
        @tentar-novamente="controle.tentarArquivosNovamente"
      />

      <section
        class="rastreabilidade-detalhe"
        aria-labelledby="titulo-trajetoria"
        :aria-busy="carregandoTrajetoria"
      >
        <h2 id="titulo-trajetoria">
          {{
            arquivoSelecionado
              ? arquivoSelecionado.nome
              : 'Trajetória do arquivo'
          }}
        </h2>

        <div
          v-if="carregandoTrajetoria"
          class="rastreabilidade-estado"
          role="status"
        >
          Consultando trajetória...
        </div>

        <div
          v-else-if="!arquivoSelecionado"
          class="rastreabilidade-estado"
        >
          Selecione um arquivo para consultar sua trajetória.
        </div>

        <div
          v-else-if="erroTrajetoria"
          class="rastreabilidade-estado"
        >
          <button
            type="button"
            class="rastreabilidade-botao"
            @click="controle.tentarTrajetoriaNovamente()"
          >
            Tentar novamente
          </button>
        </div>

        <div
          v-else-if="trajetoria"
          class="rastreabilidade-resumo"
          role="status"
        >
          <span class="rastreabilidade-chip">
            {{ conjuntoSelecionado?.nome }}
          </span>

          <p v-if="trajetoria.passagens.length">
            Trajetória consultada.
            {{ trajetoria.passagens.length }}
            {{
              trajetoria.passagens.length === 1
                ? 'passagem registrada.'
                : 'passagens registradas.'
            }}
          </p>

          <p v-else>
            Este arquivo ainda não possui movimentações registradas.
          </p>
        </div>
      </section>
    </div>
  </main>

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
