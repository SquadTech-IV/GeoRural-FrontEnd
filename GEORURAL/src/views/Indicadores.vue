<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import BarraNavegacao from '../components/BarraNavegacao.vue'
import GraficoComposicao from '../components/GraficoComposicao.vue'
import GraficoDistribuicao from '../components/GraficoDistribuicao.vue'

defineOptions({
  name: 'ConsultaIndicadores',
})

const router = useRouter()

const METADADOS_INDICADORES = {
  IRL: {
    rotulo: 'IRL — Reserva Legal',
    unidade: '%',
    bom: { chave: 'CONFORME', texto: 'Conformes', um: 'Conforme' },
    ruim: { chave: 'DEFICIT', texto: 'Em déficit', um: 'Em déficit' },
  },
  IAE: {
    rotulo: 'IAE — Áreas Embargadas',
    unidade: '%',
    bom: { chave: 'SEM_EMBARGO', texto: 'Sem embargo', um: 'Sem embargo' },
    ruim: { chave: 'COM_EMBARGO', texto: 'Com embargo', um: 'Com embargo' },
  },
  ICV: {
    rotulo: 'ICV — Índice de Cobertura Vegetal',
    unidade: '%',
    bom: { chave: 'ALTO', texto: 'Alto', um: 'Alto' },
    ruim: { chave: 'BAIXO', texto: 'Baixo', um: 'Baixo' },
  },
}

const indicador = ref('IRL')
const versao = ref('')
const municipio = ref('')
const busca = ref('')
const paginaAtual = ref(1)

const opcoesVersoes = ref([])
const opcoesMunicipios = ref([])

const carregando = ref(false)
const itens = ref([])
const totalImoveis = ref(0)
const faixasHistograma = ref([])
const valoresHistograma = ref([])
const composicao = ref({ bons: 0, ruins: 0 })

const imovelSelecionado = ref(null)

const fmt = (v) => Number(v ?? 0).toLocaleString('pt-BR')

const metaAtual = computed(() => METADADOS_INDICADORES[indicador.value])

async function carregarOpcoesFiltros() {
}

async function buscarIndicadores(pagina = 1) {
  paginaAtual.value = pagina
  carregando.value = true

  try {//
  } finally {
    carregando.value = false
  }
}

function aplicarFiltros() {
  buscarIndicadores(1)
}

function rotuloImovel(item) {
  return item.nome || `CAR ${item.car.split('-').pop().slice(0, 8)}`
}

function abrirModal(item) {
  imovelSelecionado.value = item
}

function fecharModal() {
  imovelSelecionado.value = null
}

function irParaMapaImovel(item) {
  fecharModal()
  router.push(`/resultado/${item.car}`)
}

onMounted(async () => {
  await carregarOpcoesFiltros()
  await buscarIndicadores(1)
})
</script>

<template>
  <div class="pg-layout">
    <BarraNavegacao />

    <main class="pg-pagina">
      <header class="pg-cabecalho">
        <h1>Indicadores</h1>
        <p>
          Os resultados por imóvel, com filtro de município, imóvel, indicador e
          versão. Os gráficos mostram a mesma consulta que está na tabela.
        </p>
      </header>

      <section class="pg-filtros" aria-label="Filtros dos indicadores">
        <label class="pg-campo">
          <span>Indicador</span>
          <select v-model="indicador" @change="aplicarFiltros">
            <option value="IRL">IRL — Reserva Legal</option>
            <option value="IAE">IAE — Áreas Embargadas</option>
            <option value="ICV">ICV — Índice de Cobertura Vegetal</option>
          </select>
        </label>

        <label class="pg-campo">
          <span>Versão</span>
          <select v-model="versao">
            <option value="">Vigente</option>
            <option
              v-for="v in opcoesVersoes"
              :key="v.id ?? v"
              :value="v.id ?? v"
            >
              {{ v.rotulo ?? `#${v}` }}
            </option>
          </select>
        </label>

        <label class="pg-campo">
          <span>Município</span>
          <select v-model="municipio">
            <option value="">Todos</option>
            <option
              v-for="mun in opcoesMunicipios"
              :key="mun.id ?? mun"
              :value="mun.nome ?? mun"
            >
              {{ mun.nome ?? mun }}
            </option>
          </select>
        </label>

        <label class="pg-campo pg-campo--largo">
          <span>Imóvel</span>
          <input
            v-model="busca"
            type="search"
            placeholder="Código CAR ou nome do imóvel"
            @keyup.enter="aplicarFiltros"
          />
        </label>

        <button
          type="button"
          class="pg-botao"
          :disabled="carregando"
          @click="aplicarFiltros"
        >
          {{ carregando ? 'Buscando...' : 'Aplicar' }}
        </button>
      </section>

      <div class="graf-dupla">
        <GraficoComposicao
          :total="composicao.bons + composicao.ruins"
          :bons="composicao.bons"
          :ruins="composicao.ruins"
          :rotulo-bom="metaAtual.bom.texto"
          :rotulo-ruim="metaAtual.ruim.texto"
        />

        <GraficoDistribuicao
          :faixas="faixasHistograma"
          :valores="valoresHistograma"
        />
      </div>

      <section class="pg-bloco">
        <div class="pg-bloco-topo">
          <h2>Resultados por imóvel</h2>
          <span>
            {{ fmt(itens.length) }} de {{ fmt(totalImoveis) }} imóveis
          </span>
        </div>

        <div class="pg-rolagem">
          <table class="pg-tabela">
            <thead>
              <tr>
                <th>Imóvel</th>
                <th>Município</th>
                <th>Indicador</th>
                <th class="num">Valor</th>
                <th>Situação</th>
                <th>Versão</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="carregando">
                <td colspan="6" class="pg-vazio">Carregando resultados...</td>
              </tr>
              <template v-else-if="itens.length">
                <tr
                  v-for="item in itens"
                  :key="item.car"
                  @click="abrirModal(item)"
                >
                  <td>
                    <strong>{{ rotuloImovel(item) }}</strong>
                    <small class="pg-mono">{{ item.car }}</small>
                  </td>
                  <td>{{ item.municipio }}</td>
                  <td>{{ metaAtual.rotulo.split(' — ')[0] }}</td>
                  <td class="num">{{ item.valor }}{{ metaAtual.unidade }}</td>
                  <td>
                    <span
                      v-if="item.situacao === metaAtual.bom.chave"
                      class="pg-selo pg-selo--sucesso"
                    >
                      {{ metaAtual.bom.um }}
                    </span>
                    <span v-else class="pg-selo pg-selo--erro">
                      {{ metaAtual.ruim.um }}
                    </span>
                  </td>
                  <td>#{{ item.versao }}</td>
                </tr>
              </template>
              <tr v-else>
                <td colspan="6" class="pg-vazio">Nenhum imóvel neste filtro.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer class="pg-rodape">
          <span>
            Página {{ paginaAtual }} — mostrando {{ fmt(itens.length) }} resultados
          </span>
          <span>
            <button
              type="button"
              class="pg-botao"
              :disabled="paginaAtual <= 1 || carregando"
              @click="buscarIndicadores(paginaAtual - 1)"
            >
              Anteriores
            </button>
            <button
              type="button"
              class="pg-botao"
              :disabled="itens.length === 0 || carregando"
              @click="buscarIndicadores(paginaAtual + 1)"
            >
              Próximos
            </button>
          </span>
        </footer>
      </section>
    </main>

    <div
      v-if="imovelSelecionado"
      class="pg-modal"
      role="dialog"
      aria-modal="true"
      @click.self="fecharModal"
    >
      <div class="pg-modal-caixa" style="width: min(36rem, 100%)">
        <header>
          <div>
            <h2>{{ rotuloImovel(imovelSelecionado) }}</h2>
            <p class="pg-mono">{{ imovelSelecionado.car }}</p>
          </div>
          <button type="button" class="pg-botao" @click="fecharModal">Fechar</button>
        </header>

        <table class="pg-tabela">
          <tbody>
            <tr>
              <td>Município</td>
              <td class="num"><strong>{{ imovelSelecionado.municipio }}</strong></td>
            </tr>
            <tr>
              <td>{{ metaAtual.rotulo }}</td>
              <td class="num">
                <strong>{{ imovelSelecionado.valor }}{{ metaAtual.unidade }}</strong>
              </td>
            </tr>
            <tr>
              <td>Situação</td>
              <td class="num">
                <span
                  v-if="imovelSelecionado.situacao === metaAtual.bom.chave"
                  class="pg-selo pg-selo--sucesso"
                >
                  {{ metaAtual.bom.um }}
                </span>
                <span v-else class="pg-selo pg-selo--erro">
                  {{ metaAtual.ruim.um }}
                </span>
              </td>
            </tr>
            <tr>
              <td>Versão</td>
              <td class="num">#{{ imovelSelecionado.versao }}</td>
            </tr>
          </tbody>
        </table>

        <div class="pg-modal-rodape">
          <span class="pg-ajuda" style="margin: 0">Resumo do imóvel.</span>
          <button
            type="button"
            class="pg-botao pg-botao--principal"
            @click="irParaMapaImovel(imovelSelecionado)"
          >
            Ver completo no mapa do imóvel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '../assets/css/resultados-indicadores.css';
</style>
