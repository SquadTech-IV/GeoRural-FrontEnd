<script setup>
import { ref } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import BarraNavegacao from '../components/BarraNavegacao.vue'
import ListaIndicadores from '../components/ListaIndicadores.vue'

const indicadores = ref([
  {
    id: 'irl',
    codigo: 'IRL',
    nome: 'Reserva Legal',
    possuiParametros: true,
  },
  {
    id: 'idesmat',
    codigo: 'IDesmat',
    nome: 'Desmatamento',
    possuiParametros: true,
  },
  {
    id: 'ifc',
    codigo: 'IFC',
    nome: 'Focos de calor',
    possuiParametros: true,
  },
  {
    id: 'iae',
    codigo: 'IAE',
    nome: 'Área embargada',
    possuiParametros: false,
  },
  {
    id: 'icv',
    codigo: 'ICV',
    nome: 'Cobertura vegetal nativa',
    possuiParametros: false,
  },
  {
    id: 'iapp',
    codigo: 'IAPP',
    nome: 'APP conservada',
    possuiParametros: false,
  },
  {
    id: 'isap',
    codigo: 'ISAP',
    nome: 'Áreas protegidas',
    possuiParametros: false,
  },
])

const indicadorSelecionado = ref(null)

function selecionarIndicador(indicador) {
  indicadorSelecionado.value = indicador
}
</script>

<template>
  <BarraNavegacao />

  <main class="regras-pagina">
    <header class="regras-cabecalho">
      <h1>Regras e Métodos</h1>

      <p>
        Consulte os métodos de cálculo, configure os parâmetros
        e acompanhe o histórico de versões.
      </p>
    </header>

    <div class="regras-layout">
      <ListaIndicadores
        :indicadores="indicadores"
        :selecionado-id="indicadorSelecionado?.id ?? null"
        @selecionar="selecionarIndicador"
      />

      <section class="regras-detalhe">
        <header class="regras-detalhe-cabecalho">
          <div>
            <h2 v-if="indicadorSelecionado">
              {{ indicadorSelecionado.codigo }}
              ·
              {{ indicadorSelecionado.nome }}
            </h2>

            <h2 v-else>
              Detalhes do indicador
            </h2>

            <p v-if="!indicadorSelecionado">
              Selecione um indicador para consultar suas informações.
            </p>

            <p v-else>
              Consulte as informações do indicador selecionado.
            </p>

            <small v-if="indicadorSelecionado">
              Versão vigente: —
            </small>
          </div>

          <span
            v-if="indicadorSelecionado"
            class="regras-etiqueta"
          >
            {{
              indicadorSelecionado.possuiParametros
                ? 'Configurável'
                : 'Consulta'
            }}
          </span>
        </header>

        <template v-if="indicadorSelecionado">
          <details :key="indicadorSelecionado.id">
            <summary class="regras-formula-botao">
              Como é calculado
            </summary>

            <div class="regras-formula">
              Nenhum método de cálculo carregado.
            </div>
          </details>

          <section class="regras-parametros-vazios">
            <h3 class="regras-secao-titulo">
              Parâmetros
            </h3>

            <p
              v-if="indicadorSelecionado.possuiParametros"
              class="regras-texto-secundario"
            >
              Nenhum parâmetro carregado.
            </p>

            <p v-else class="regras-aviso">
              Este indicador não possui parâmetros configuráveis.
            </p>
          </section>

          <div
            v-if="indicadorSelecionado.possuiParametros"
            class="regras-acoes"
          >
            <RouterLink
              :to="{
                name: 'RegraNovaVersao',
                query: { indicador: indicadorSelecionado.id },
              }"
              class="regras-botao regras-botao--principal"
            >
              Nova versão
            </RouterLink>
          </div>

          <section class="regras-historico">
            <div class="regras-historico-cabecalho">
              <h3 class="regras-secao-titulo">
                Histórico de versões
              </h3>

              <RouterLink
                :to="{
                  name: 'RegraCompararVersoes',
                  query: { indicador: indicadorSelecionado.id },
                }"
                class="regras-botao"
              >
                Comparar versões
              </RouterLink>
            </div>

            <p class="regras-texto-secundario">
              Nenhuma versão carregada.
            </p>

            <RouterLink
              :to="{
                name: 'RegraDetalheVersao',
                query: { indicador: indicadorSelecionado.id },
              }"
              class="regras-botao"
            >
              Detalhes da versão
            </RouterLink>
          </section>
        </template>

        <p v-else class="regras-texto-secundario">
          Os detalhes serão apresentados após selecionar
          um indicador na lista.
        </p>
      </section>
    </div>
  </main>

  <RouterView />
</template>

<style scoped src="../assets/css/regras.css"></style>
