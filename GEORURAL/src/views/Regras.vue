<script setup>
import { ref } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import BarraNavegacao from '../components/BarraNavegacao.vue'
import ListaIndicadores from '../components/ListaIndicadores.vue'
import PainelDetalheIndicador from '../components/PainelDetalheIndicador.vue'

const router = useRouter()

const indicadores = ref([
  {
    id: 'irl',
    codigo: 'IRL',
    nome: 'Reserva Legal',
    possuiParametros: true,
    formula:
      'IRL (%) = área de Reserva Legal ÷ área do imóvel × 100. ' +
      'O resultado é comparado ao percentual mínimo configurado ' +
      'para o enquadramento do imóvel.',
  },
  {
    id: 'idesmat',
    codigo: 'IDesmat',
    nome: 'Desmatamento',
    possuiParametros: true,
    formula:
      'Para cada marco configurado, mede a supressão identificada ' +
      'pelo PRODES posterior à data, dentro do imóvel, em hectares ' +
      'e percentual da área total.',
  },
  {
    id: 'ifc',
    codigo: 'IFC',
    nome: 'Focos de calor',
    possuiParametros: true,
    formula:
      'IFC = quantidade de focos dentro do imóvel ÷ área do imóvel ' +
      'em hectares × fator de normalização configurado. ' +
      'A contagem considera o período de apuração configurado.',
  },
  {
    id: 'iae',
    codigo: 'IAE',
    nome: 'Área embargada',
    possuiParametros: false,
    formula:
      'IAE (%) = área do imóvel sobreposta a embargos ÷ área do ' +
      'imóvel × 100. O resultado também é apresentado em hectares. ' +
      'As sobreposições entre embargos são unificadas para evitar ' +
      'contagem duplicada.',
  },
  {
    id: 'icv',
    codigo: 'ICV',
    nome: 'Cobertura vegetal nativa',
    possuiParametros: false,
    formula:
      'ICV (%) = área de vegetação nativa dentro do imóvel ÷ área ' +
      'total do imóvel × 100. O resultado também é apresentado ' +
      'em hectares.',
  },
  {
    id: 'iapp',
    codigo: 'IAPP',
    nome: 'APP conservada',
    possuiParametros: false,
    formula:
      'IAPP (%) = APP com vegetação nativa ÷ APP total × 100. ' +
      'Área de APP sem vegetação nativa (ha) = APP total − APP ' +
      'com vegetação. Quando não houver APP identificada, o ' +
      'percentual é apresentado como não aplicável.',
  },
  {
    id: 'isap',
    codigo: 'ISAP',
    nome: 'Áreas protegidas',
    possuiParametros: false,
    formula:
      'Mede a área e o percentual do imóvel sobrepostos a cada ' +
      'categoria protegida, como unidades de conservação, terras ' +
      'indígenas, territórios quilombolas e florestas públicas. ' +
      'O total utiliza a união das sobreposições para evitar ' +
      'contagem duplicada.',
  },
])

const configuracaoParametros = {
  irl: [
    {
      id: 'minimo-mata-atlantica',
      nome: 'Mínimo RL — Mata Atlântica',
      descricao: 'Percentual mínimo utilizado na comparação.',
      tipo: 'percentual',
      unidade: '%',
    },
    {
      id: 'minimo-amazonia',
      nome: 'Mínimo RL — Amazônia Legal',
      descricao: 'Percentual mínimo utilizado na comparação.',
      tipo: 'percentual',
      unidade: '%',
    },
  ],
  idesmat: [
    {
      id: 'marco-1',
      nome: 'Marco 1',
      descricao: 'Primeira data de referência.',
      tipo: 'data',
    },
    {
      id: 'marco-2',
      nome: 'Marco 2',
      descricao: 'Segunda data de referência.',
      tipo: 'data',
    },
    {
      id: 'marco-3',
      nome: 'Marco 3',
      descricao: 'Terceira data de referência.',
      tipo: 'data',
    },
  ],
  ifc: [
    {
      id: 'fator-normalizacao',
      nome: 'Fator de normalização',
      descricao: 'Base de comparação por área.',
      tipo: 'numero',
      unidade: 'ha',
      positivo: true,
    },
    {
      id: 'periodo-apuracao',
      nome: 'Período de apuração',
      descricao: 'Janela de contagem dos focos.',
      tipo: 'numero',
      unidade: 'meses',
      positivo: true,
      inteiro: true,
    },
  ],
}

indicadores.value = indicadores.value.map((indicador) => ({
  ...indicador,
  parametros: configuracaoParametros[indicador.id] ?? [],
}))

const indicadorSelecionado = ref(null)
const parametrosPendentes = ref(null)

function selecionarIndicador(indicador) {
  indicadorSelecionado.value = indicador
  parametrosPendentes.value = null
}

function abrirNovaVersao(dados) {
  parametrosPendentes.value = dados

  router.push({
    name: 'RegraNovaVersao',
    query: {
      indicador: dados.indicadorId,
    },
  })
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
        @salvar-nova-versao="abrirNovaVersao"
      >
        <template #default="{ indicador }">
          <section class="regras-historico">
            <div class="regras-historico-cabecalho">
              <h3 class="regras-secao-titulo">
                Histórico de versões
              </h3>

              <RouterLink
                :to="{
                  name: 'RegraCompararVersoes',
                  query: { indicador: indicador.id },
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
                query: { indicador: indicador.id },
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

  <RouterView v-slot="{ Component }">
    <component
      :is="Component"
      v-if="Component"
      :parametros-pendentes="parametrosPendentes"
    />
  </RouterView>
</template>

<style scoped src="../assets/css/regras.css"></style>
