<script setup>
import { ref } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import BarraNavegacao from '../components/BarraNavegacao.vue'
import ListaIndicadores from '../components/ListaIndicadores.vue'
import PainelDetalheIndicador from '../components/PainelDetalheIndicador.vue'

const indicadores = ref([
  {
    id: 'irl',
    codigo: 'IRL',
    nome: 'Reserva Legal',
    possuiParametros: true,
    formula:
      'IRL (%) = área de Reserva Legal ÷ área do imóvel × 100, comparado ao mínimo do bioma (Mata Atlântica: 20%, Amazônia: 80%).',
  },
  {
    id: 'idesmat',
    codigo: 'IDesmat',
    nome: 'Desmatamento',
    possuiParametros: true,
    formula:
      'Para cada marco, mede a supressão (PRODES) posterior à data, dentro do imóvel, em ha e %. Marcos: 22/07/2008, 31/07/2019 e 31/12/2020.',
  },
  {
    id: 'ifc',
    codigo: 'IFC',
    nome: 'Focos de calor',
    possuiParametros: true,
    formula:
      'IFC = focos dentro do imóvel ÷ área do imóvel (ha) × 1000ha, no período de 12meses.',
  },
  {
    id: 'iae',
    codigo: 'IAE',
    nome: 'Área embargada',
    possuiParametros: false,
    formula:
      'IAE (%) = área do imóvel sobreposta a embargos ÷ área do imóvel × 100, também em hectares.',
  },
  {
    id: 'icv',
    codigo: 'ICV',
    nome: 'Cobertura vegetal nativa',
    possuiParametros: false,
    formula:
      'ICV (%) = vegetação nativa dentro do imóvel ÷ área do imóvel × 100, também em hectares.',
  },
  {
    id: 'iapp',
    codigo: 'IAPP',
    nome: 'APP conservada',
    possuiParametros: false,
    formula:
      'IAPP (%) = APP com vegetação nativa ÷ APP total × 100. Passivo (ha) = APP total − APP com vegetação.',
  },
  {
    id: 'isap',
    codigo: 'ISAP',
    nome: 'Áreas protegidas',
    possuiParametros: false,
    formula:
      'ISAP = área e % do imóvel sobreposta a cada categoria protegida (UC, TI, quilombos, florestas públicas), dissolvidas entre si para não contar área duas vezes.',
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

      <PainelDetalheIndicador
        :indicador="indicadorSelecionado"
      >
        <template #default>
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
      </PainelDetalheIndicador>
    </div>
  </main>

  <RouterView />
</template>

<style scoped src="../assets/css/regras.css"></style>
