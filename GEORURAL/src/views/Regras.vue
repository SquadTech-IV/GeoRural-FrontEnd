<script setup>
import { ref } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import BarraNavegacao from '../components/BarraNavegacao.vue'
import ListaIndicadores from '../components/ListaIndicadores.vue'
import PainelDetalheIndicador from '../components/PainelDetalheIndicador.vue'
import HistoricoVersoes from '../components/HistoricoVersoes.vue'
import { regraService } from '../services/regraService'

const router = useRouter()

const salvandoVersao = ref(false)
const erroSalvarVersao = ref('')
const mensagemSucesso = ref('')
const indicadorSelecionado = ref(null)
const parametrosPendentes = ref(null)

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

const indicadores = ref(
  [
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
  ].map((indicador) => ({
    ...indicador,
    parametros: configuracaoParametros[indicador.id] ?? [],
    versoes: [],
  })),
)

function selecionarIndicador(indicador) {
  if (salvandoVersao.value) return

  indicadorSelecionado.value = indicador
  parametrosPendentes.value = null
  erroSalvarVersao.value = ''
  mensagemSucesso.value = ''
}

function abrirNovaVersao(dados) {
  if (salvandoVersao.value) return

  if (
    !indicadorSelecionado.value ||
    dados.indicadorId !== indicadorSelecionado.value.id
  ) {
    return
  }

  parametrosPendentes.value = dados
  erroSalvarVersao.value = ''
  mensagemSucesso.value = ''

  router.push({
    name: 'RegraNovaVersao',
    query: {
      indicador: dados.indicadorId,
    },
  })
}

async function confirmarNovaVersao(dados) {
  if (salvandoVersao.value) return

  const indicador = indicadorSelecionado.value

  if (
    !indicador ||
    dados.indicadorId !== indicador.id ||
    parametrosPendentes.value?.indicadorId !== indicador.id
  ) {
    erroSalvarVersao.value =
      'Selecione o indicador e revise os parâmetros novamente.'
    return
  }

  salvandoVersao.value = true
  erroSalvarVersao.value = ''
  mensagemSucesso.value = ''

  try {
    const resposta = await regraService.criarVersao(dados)

    if (
      !resposta ||
      resposta.id !== indicador.id ||
      !Array.isArray(resposta.parametros) ||
      resposta.versaoVigente == null ||
      !Array.isArray(resposta.versoes)
    ) {
      throw new Error(
        'Não foi possível confirmar os dados da nova versão. ' +
        'Consulte o histórico antes de tentar salvar novamente.',
      )
    }

    const indicadorAtualizado = {
      ...indicador,
      ...resposta,
    }

    indicadores.value = indicadores.value.map((item) =>
      item.id === indicadorAtualizado.id
        ? indicadorAtualizado
        : item,
    )

    indicadorSelecionado.value = indicadorAtualizado
    parametrosPendentes.value = null
    mensagemSucesso.value = 'Nova versão criada com sucesso.'

    await router.push({ name: 'Regras' })
  } catch (erro) {
    const mensagem =
      erro.response?.data?.mensagem ||
      erro.response?.data?.message ||
      erro.message

    erroSalvarVersao.value =
      typeof mensagem === 'string'
        ? mensagem
        : 'Não foi possível salvar a nova versão. Tente novamente.'
  } finally {
    salvandoVersao.value = false
  }
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

    <p
      v-if="mensagemSucesso"
      class="regras-sucesso"
      role="status"
    >
      {{ mensagemSucesso }}
    </p>

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
          <HistoricoVersoes :indicador="indicador" />
        </template>
      </PainelDetalheIndicador>
    </div>
  </main>

  <RouterView v-slot="{ Component, route }">
    <component
      :is="Component"
      v-if="Component && route.name === 'RegraNovaVersao'"
      :parametros-pendentes="parametrosPendentes"
      :indicador="indicadorSelecionado"
      :salvando="salvandoVersao"
      :erro="erroSalvarVersao"
      @confirmar="confirmarNovaVersao"
    />

    <component
      :is="Component"
      v-else-if="Component && route.name === 'RegraDetalheVersao'"
      :indicador="indicadorSelecionado"
    />

    <component
      :is="Component"
      v-else-if="Component"
    />
  </RouterView>
</template>

<style scoped src="../assets/css/regras.css"></style>
