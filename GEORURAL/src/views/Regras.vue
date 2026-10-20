<script setup>
import { onMounted, ref, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import BarraNavegacao from '../components/BarraNavegacao.vue'
import ListaIndicadores from '../components/ListaIndicadores.vue'
import PainelDetalheIndicador from '../components/PainelDetalheIndicador.vue'
import HistoricoVersoes from '../components/HistoricoVersoes.vue'
import { regraService, mensagemErro } from '../services/regraService'

defineOptions({ name: 'RegrasIndicadores' })

defineOptions({ name: 'RegrasPagina' })

const router = useRouter()
const route = useRoute()
const indicadores = ref([])
const carregandoLista = ref(false)
const erroLista = ref('')
const salvandoVersao = ref(false)
const erroSalvarVersao = ref('')
const mensagemSucesso = ref('')
const indicadorSelecionado = ref(null)
const parametrosPendentes = ref(null)
const carregandoIndicador = ref(false)
const erroCarregarIndicador = ref('')
let consultaAtual = 0

async function carregarLista() {
  if (carregandoLista.value) return
  carregandoLista.value = true
  erroLista.value = ''
  try {
    indicadores.value = await regraService.listarIndicadores()
    await carregarDaRota()
  } catch (erro) {
    erroLista.value = mensagemErro(erro, 'Não foi possível carregar os indicadores.')
  } finally {
    carregandoLista.value = false
  }
}

async function carregarDaRota() {
  const sigla = Array.isArray(route.query.indicador)
    ? route.query.indicador[0]
    : route.query.indicador
  if (!sigla || String(indicadorSelecionado.value?.id) === String(sigla)) return
  await carregarIndicador(sigla)
}

async function selecionarIndicador(indicador) {
  if (salvandoVersao.value) return
  if (route.name !== 'Regras') await router.push({ name: 'Regras' })
  parametrosPendentes.value = null
  erroSalvarVersao.value = ''
  mensagemSucesso.value = ''
  indicadorSelecionado.value = indicador
  await carregarIndicador(indicador.id)
}

async function carregarIndicador(id) {
  const consulta = ++consultaAtual
  carregandoIndicador.value = true
  erroCarregarIndicador.value = ''
  try {
    const indicador = await regraService.obterIndicador(id)
    if (consulta !== consultaAtual) return
    indicadorSelecionado.value = indicador
    indicadores.value = indicadores.value.map((item) =>
      item.id === indicador.id ? indicador : item,
    )
  } catch (erro) {
    if (consulta !== consultaAtual) return
    erroCarregarIndicador.value = mensagemErro(erro, 'Não foi possível carregar o indicador.')
  } finally {
    if (consulta === consultaAtual) carregandoIndicador.value = false
  }
}

function tentarNovamenteIndicador() {
  if (carregandoIndicador.value) return
  const id = indicadorSelecionado.value?.id || route.query.indicador
  if (id) carregarIndicador(id)
}

function abrirNovaVersao(dados) {
  if (salvandoVersao.value || carregandoIndicador.value || erroCarregarIndicador.value) return
  parametrosPendentes.value = dados
  erroSalvarVersao.value = ''
  mensagemSucesso.value = ''
  router.push({ name: 'RegraNovaVersao', query: { indicador: dados.indicadorId } })
}

async function confirmarNovaVersao(dados) {
  if (salvandoVersao.value) return
  salvandoVersao.value = true
  erroSalvarVersao.value = ''
  mensagemSucesso.value = ''
  try {
    const indicador = await regraService.criarVersao(dados)
    indicadores.value = indicadores.value.map((item) =>
      item.id === indicador.id ? indicador : item,
    )
    indicadorSelecionado.value = indicador
    parametrosPendentes.value = null
    mensagemSucesso.value = 'Nova versão criada com sucesso.'
    await router.push({ name: 'Regras' })
  } catch (erro) {
    erroSalvarVersao.value = mensagemErro(erro, 'Não foi possível salvar a nova versão.')
  } finally {
    salvandoVersao.value = false
  }
}

watch(() => route.query.indicador, carregarDaRota)
onMounted(carregarLista)
</script>

<template>
  <BarraNavegacao />

  <main class="regras-pagina">
    <header class="regras-cabecalho">
      <h1>Regras e Métodos</h1>

      <p>
        Consulte os métodos de cálculo, configure os parâmetros e acompanhe o histórico de versões.
      </p>
    </header>

    <p v-if="mensagemSucesso" class="regras-sucesso" role="status">
      {{ mensagemSucesso }}
    </p>

    <div class="regras-layout">
      <ListaIndicadores
        :indicadores="indicadores"
        :carregando="carregandoLista"
        :erro="erroLista"
        @tentar-novamente="carregarLista"
        :selecionado-id="indicadorSelecionado?.id ?? null"
        @selecionar="selecionarIndicador"
      />

      <PainelDetalheIndicador
        :indicador="indicadorSelecionado"
        :carregando="carregandoIndicador"
        :erro="erroCarregarIndicador"
        @tentar-novamente="tentarNovamenteIndicador"
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
      v-else-if="
        Component && (route.name === 'RegraDetalheVersao' || route.name === 'RegraCompararVersoes')
      "
      :indicador="indicadorSelecionado"
      :carregando="carregandoIndicador"
      :erro="erroCarregarIndicador"
      @tentar-novamente="tentarNovamenteIndicador"
    />

    <component :is="Component" v-else-if="Component" />
  </RouterView>
</template>

<style scoped src="../assets/css/regras.css"></style>
