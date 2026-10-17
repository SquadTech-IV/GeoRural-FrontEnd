<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import BarraNavegacao from '../components/BarraNavegacao.vue'
import MapaGeografico from '../components/MapaGeografico.vue'
import {
  mapaIndicadoresService,
  criarVisaoGeral,
  criarCamadas,
  formatarNumero,
  formatarResultado,
  requisicaoCancelada,
  obterMensagemErro,
} from '../services/mapaIndicadoresService'

defineOptions({ name: 'MapaIndicadores' })
const props = defineProps({ car: { type: String, default: '' } })
const router = useRouter()
const imoveis = ref([])
const selecionado = ref(null)
const carregandoLista = ref(false)
const carregandoDetalhe = ref(false)
const erroLista = ref('')
const erroDetalhe = ref('')
let consultaLista = null
let consultaDetalhe = null
let desmontado = false

const geojson = computed(() =>
  props.car ? (selecionado.value?.geojson ?? null) : criarVisaoGeral(imoveis.value),
)
const camadas = computed(() => criarCamadas(selecionado.value))

async function carregarLista() {
  consultaLista?.abort()
  const consulta = new AbortController()
  consultaLista = consulta
  carregandoLista.value = true
  erroLista.value = ''
  try {
    const dados = await mapaIndicadoresService.listarMapa({ signal: consulta.signal })
    if (!desmontado && !consulta.signal.aborted) imoveis.value = dados
  } catch (erro) {
    if (!desmontado && !consulta.signal.aborted && !requisicaoCancelada(erro)) {
      erroLista.value = obterMensagemErro(erro)
    }
  } finally {
    if (!desmontado && consultaLista === consulta) carregandoLista.value = false
  }
}

async function carregarDetalhe(car) {
  consultaDetalhe?.abort()
  consultaDetalhe = null
  selecionado.value = null
  erroDetalhe.value = ''
  carregandoDetalhe.value = false
  if (!car) return
  const consulta = new AbortController()
  consultaDetalhe = consulta
  carregandoDetalhe.value = true
  try {
    const dados = await mapaIndicadoresService.buscarImovel(car, { signal: consulta.signal })
    if (!desmontado && !consulta.signal.aborted) selecionado.value = dados
  } catch (erro) {
    if (!desmontado && !consulta.signal.aborted && !requisicaoCancelada(erro)) {
      erroDetalhe.value = obterMensagemErro(erro)
    }
  } finally {
    if (!desmontado && consultaDetalhe === consulta) carregandoDetalhe.value = false
  }
}

async function selecionarImovel(evento) {
  try {
    await router.push({
      name: 'MapaIndicadores',
      params: { car: evento.target.value || undefined },
    })
  } catch (erro) {
    erroDetalhe.value = obterMensagemErro(erro)
  }
}

watch(() => props.car, carregarDetalhe, { immediate: true })
carregarLista()
onBeforeUnmount(() => {
  desmontado = true
  consultaLista?.abort()
  consultaDetalhe?.abort()
})
</script>

<template>
  <BarraNavegacao />
  <main class="mapa-base-pagina">
    <header class="mapa-base-cabecalho">
      <div>
        <RouterLink :to="{ name: 'Imoveis' }" class="mapa-base-voltar">
          ‹ Voltar para imóveis
        </RouterLink>
        <h1>Mapa de indicadores</h1>
        <p>Consulte o limite do imóvel e as geometrias dos indicadores vigentes.</p>
      </div>
    </header>

    <section class="mapa-api-selecao" :aria-busy="carregandoLista" aria-label="Seleção do imóvel">
      <label for="mapa-imovel">Imóvel</label>
      <select id="mapa-imovel" :value="car" :disabled="carregandoLista" @change="selecionarImovel">
        <option value="">Todos os imóveis</option>
        <option v-if="car && !imoveis.some((item) => item.codigoCar === car)" :value="car">
          {{ car }}
        </option>
        <option v-for="imovel in imoveis" :key="imovel.codigoCar" :value="imovel.codigoCar">
          {{ imovel.codigoCar }}{{ imovel.municipio ? ` · ${imovel.municipio}` : '' }}
        </option>
      </select>
      <span v-if="carregandoLista" role="status">Carregando imóveis...</span>
    </section>

    <div v-if="erroLista" class="mapa-api-estado mapa-api-estado--erro" role="alert">
      <p>{{ erroLista }}</p>
      <button type="button" @click="carregarLista">Tentar novamente</button>
    </div>
    <p v-else-if="!carregandoLista && !imoveis.length" class="mapa-api-estado" role="status">
      Nenhum imóvel disponível na listagem do mapa.
    </p>
    <p v-if="carregandoDetalhe" class="mapa-api-estado" role="status">
      Carregando imóvel e indicadores...
    </p>
    <div v-if="erroDetalhe" class="mapa-api-estado mapa-api-estado--erro" role="alert">
      <p>{{ erroDetalhe }}</p>
      <button type="button" @click="carregarDetalhe(car)">Tentar novamente</button>
    </div>

    <section v-if="selecionado" class="mapa-api-resumo" aria-label="Dados do imóvel">
      <div>
        <span>CAR</span><strong>{{ selecionado.codigoCar }}</strong>
      </div>
      <div>
        <span>Município</span><strong>{{ selecionado.municipio || 'Não informado' }}</strong>
      </div>
      <div>
        <span>Área total</span><strong>{{ formatarNumero(selecionado.areaTotal, 'ha') }}</strong>
      </div>
    </section>

    <div class="mapa-base-conteudo">
      <MapaGeografico :geojson="geojson" :indicadores="camadas" />
    </div>

    <section v-if="selecionado" class="mapa-api-resultados" aria-labelledby="titulo-indicadores">
      <h2 id="titulo-indicadores">Indicadores vigentes</h2>
      <p v-if="!selecionado.indicadores.length" class="mapa-api-estado">
        Nenhum indicador vigente retornado para este imóvel.
      </p>
      <ul v-else class="mapa-api-lista">
        <li v-for="indicador in selecionado.indicadores" :key="indicador.id" class="mapa-api-card">
          <h3>{{ indicador.sigla }} · {{ indicador.nome }}</h3>
          <strong>{{ formatarResultado(indicador) }}</strong>
          <p>Situação: {{ indicador.situacao || 'Não informada' }}</p>
          <p>Versão da regra: {{ indicador.versaoRegra || 'Não informada' }}</p>
          <p v-if="!camadas.some((camada) => camada.id === indicador.id)">
            Sem geometria disponível para exibição no mapa.
          </p>
        </li>
      </ul>
    </section>
  </main>
</template>

<style scoped src="../assets/css/mapa-base.css"></style>
