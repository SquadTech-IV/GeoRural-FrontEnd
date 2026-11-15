<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import BarraNavegacao from '../components/BarraNavegacao.vue'
import ModalDetalheMunicipio from '../components/ModalDetalheMunicipio.vue'

defineOptions({
  name: 'ComparacaoMunicipios',
})

const router = useRouter()

const RAMPA_CORES = [
  'var(--cor-erro, #f87171)',
  '#fb923c',
  '#fbbf24',
  '#a3e635',
  'var(--cor-sucesso, #34d399)',
]

const sigla = ref('')
const versaoId = ref('')
const ordenacao = ref('PIOR_PRIMEIRO')
const qtdFaixas = ref(5)
const busca = ref('')

const indicadores = ref([])
const versoes = ref([])

const carregando = ref(false)
const indicadorAtual = ref(null)
const resumo = ref({
  totalMunicipios: 0,
  comDados: 0,
  semDados: 0,
  piorValor: null,
  piorMunicipio: null,
  mediana: null,
})
const faixasInfo = ref({
  lista: [],
  min: null,
  max: null,
  origem: null,
  estrategia: 'INTERVALO',
})
const linhas = ref([])
const municipioSelecionado = ref(null)

const unidade = computed(() => indicadorAtual.value?.unidade ?? '')
const ehPercentual = computed(() => unidade.value === '%')

const linhasFiltradas = computed(() => {
  const termo = busca.value.trim().toLowerCase()
  if (!termo) return linhas.value
  return linhas.value.filter(
    (l) =>
      String(l.nome || '').toLowerCase().includes(termo) ||
      String(l.ibge || '').includes(termo)
  )
})

const totalNaFaixa = computed(
  () => faixasInfo.value.lista.reduce((acc, f) => acc + (f.qtd ?? 0), 0) || 1
)

function corDaQualidade(pos, total) {
  if (!pos || total <= 1) return RAMPA_CORES[RAMPA_CORES.length - 1]
  const idx = Math.round(((pos - 1) / (total - 1)) * (RAMPA_CORES.length - 1))
  return RAMPA_CORES[idx] ?? RAMPA_CORES[0]
}

function fmtNumero(v, casas = 2) {
  if (v === null || v === undefined) return '—'
  return Number(v).toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })
}

function fmtInteiro(v) {
  if (v === null || v === undefined) return '—'
  return Number(v).toLocaleString('pt-BR')
}

async function carregarOpcoes() {
}

async function consultarMunicipios() {
  if (!sigla.value) return
  carregando.value = true
  try {
  } finally {
    carregando.value = false
  }
}

function abrirModal(municipio) {
  municipioSelecionado.value = municipio
}

function fecharModal() {
  municipioSelecionado.value = null
}

function verNoMapa(municipio) {
  if (!municipio) return
  fecharModal()
  router.push({
    path: '/mapa-indicadores',
    query: {
      indicador: sigla.value,
      versaoId: versaoId.value || undefined,
      ibge: municipio.ibge,
    },
  })
}

onMounted(async () => {
  await carregarOpcoes()
  await consultarMunicipios()
})
</script>

<template>
  <div class="pg-layout">
    <BarraNavegacao />

    <main class="pg-pagina">
      <header class="pg-cabecalho">
        <h1>Comparação entre municípios</h1>
        <p>
          Resultados agregados por município em um indicador. A ordenação
          <strong>pior primeiro</strong> ajusta-se automaticamente ao sentido do
          indicador selecionado.
        </p>
      </header>

      <section class="pg-filtros" aria-label="Filtros de comparação">
        <label class="pg-campo mun-campo-busca">
          <span>Buscar</span>
          <input
            v-model="busca"
            type="search"
            placeholder="Buscar município ou código IBGE…"
          />
        </label>

        <label class="pg-campo">
          <span>Indicador</span>
          <select v-model="sigla" @change="consultarMunicipios">
            <option value="" disabled>Selecione</option>
            <option
              v-for="ind in indicadores"
              :key="ind.sigla"
              :value="ind.sigla"
            >
              {{ ind.sigla }} — {{ ind.nome }}
            </option>
          </select>
        </label>

        <label class="pg-campo">
          <span>Versão</span>
          <select v-model="versaoId" @change="consultarMunicipios">
            <option value="">Vigente</option>
            <option
              v-for="v in versoes"
              :key="v.id"
              :value="v.id"
            >
              {{ v.rotulo ?? `#${v.id}` }}
            </option>
          </select>
        </label>

        <label class="pg-campo">
          <span>Ordenação</span>
          <select v-model="ordenacao" @change="consultarMunicipios">
            <option value="PIOR_PRIMEIRO">Pior primeiro</option>
            <option value="MELHOR_PRIMEIRO">Melhor primeiro</option>
            <option value="NOME">Nome (A–Z)</option>
            <option value="MAIS_IMOVEIS">Mais imóveis</option>
            <option value="MENOS_CONFORMES">Menos conformes</option>
          </select>
        </label>

        <label class="pg-campo">
          <span>Faixas</span>
          <select v-model.number="qtdFaixas" @change="consultarMunicipios">
            <option :value="3">3 faixas</option>
            <option :value="5">5 faixas</option>
            <option :value="7">7 faixas</option>
          </select>
        </label>
      </section>

      <section class="mun-kpis" aria-label="Resumo do indicador">
        <article class="pg-bloco mun-kpi">
          <span class="mun-kpi-k">Municípios</span>
          <strong class="mun-kpi-v">{{ fmtInteiro(resumo.totalMunicipios) }}</strong>
          <span class="mun-kpi-m">{{ fmtInteiro(resumo.comDados) }} com resultado</span>
        </article>

        <article class="pg-bloco mun-kpi mun-kpi--alerta">
          <span class="mun-kpi-k">Pior</span>
          <strong class="mun-kpi-v">
            {{
              resumo.piorValor !== null
                ? `${fmtNumero(resumo.piorValor)}${ehPercentual ? '%' : ''}`
                : '—'
            }}
          </strong>
          <span class="mun-kpi-m">{{ resumo.piorMunicipio || '—' }}</span>
        </article>

        <article class="pg-bloco mun-kpi">
          <span class="mun-kpi-k">Mediana</span>
          <strong class="mun-kpi-v">
            {{
              resumo.mediana !== null
                ? `${fmtNumero(resumo.mediana)}${ehPercentual ? '%' : ''}`
                : '—'
            }}
          </strong>
          <span class="mun-kpi-m">metade está abaixo disto</span>
        </article>

        <article class="pg-bloco mun-kpi">
          <span class="mun-kpi-k">Sem resultado</span>
          <strong class="mun-kpi-v">{{ fmtInteiro(resumo.semDados) }}</strong>
          <span class="mun-kpi-m">exibidos ao final da lista</span>
        </article>
      </section>

      <section class="pg-bloco mun-faixas-bloco">
        <div class="mun-faixas-topo">
          <div>
            <h2>Distribuição pelas {{ faixasInfo.lista.length || qtdFaixas }} faixas</h2>
            <p v-if="indicadorAtual">
              <template v-if="indicadorAtual.sentido === 'MAIOR_MELHOR'">
                Da esquerda (pior) para a direita (melhor)
              </template>
              <template v-else>
                Valor baixo é favorável neste indicador; a faixa da esquerda representa o melhor desempenho
              </template>
            </p>
          </div>

          <span v-if="indicadorAtual" class="pg-selo mun-selo-sentido">
            {{
              indicadorAtual.sentido === 'MAIOR_MELHOR'
                ? '↑ maior é melhor'
                : '↓ menor é melhor'
            }}
            · {{ sigla }}
          </span>
        </div>

        <div class="mun-faixa-barra">
          <div
            v-for="f in faixasInfo.lista"
            :key="f.ordem"
            :style="{
              width: `${(f.qtd / totalNaFaixa) * 100}%`,
              background: corDaQualidade(f.pos, faixasInfo.lista.length),
            }"
            :title="`${f.rotulo}: ${f.qtd} município(s)`"
          >
            <span v-if="f.qtd > 8">{{ f.qtd }}</span>
          </div>
        </div>

        <div v-if="faixasInfo.lista.length" class="mun-faixa-legenda">
          <span
            v-for="f in faixasInfo.lista"
            :key="f.ordem"
            class="mun-faixa-item"
          >
            <i
              class="mun-sw"
              :style="{ background: corDaQualidade(f.pos, faixasInfo.lista.length) }"
            />
            {{ f.rotulo }}{{ ehPercentual ? '%' : '' }} ·
            <strong>{{ fmtInteiro(f.qtd) }}</strong>
          </span>
        </div>

        <div
          v-if="faixasInfo.min !== null && faixasInfo.max !== null"
          class="mun-escala"
        >
          <span>Escala</span>
          <span class="mun-escala-tag">{{ faixasInfo.min }} a {{ faixasInfo.max }}</span>
          <span>Origem</span>
          <span class="mun-escala-tag">
            {{
              faixasInfo.origem === 'INDICADOR'
                ? 'Cadastrada no indicador'
                : 'Mínimo e máximo dos dados'
            }}
          </span>
          <span>Estratégia</span>
          <span class="mun-escala-tag">{{ faixasInfo.estrategia }}</span>
        </div>
      </section>

      <section class="pg-bloco">
        <div class="pg-bloco-topo">
          <h2>Resultados por município</h2>
          <span>
            <template v-if="busca.trim()">
              {{ fmtInteiro(linhasFiltradas.length) }} município(s) encontrado(s)
            </template>
            <template v-else>
              {{ fmtInteiro(linhasFiltradas.length) }} municípios
            </template>
          </span>
        </div>

        <div class="pg-rolagem mun-tabela-rolagem">
          <table class="pg-tabela">
            <thead>
              <tr>
                <th style="width: 54px">#</th>
                <th>Município</th>
                <th style="width: 100px">IBGE</th>
                <th class="num">Valor</th>
                <th style="width: 140px">Faixa</th>
                <th class="num">Imóveis</th>
                <th class="num">Conformes</th>
                <th class="num">Hectares</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="carregando">
                <td colspan="8" class="pg-vazio">Carregando municípios...</td>
              </tr>

              <template v-else-if="linhasFiltradas.length">
                <tr
                  v-for="item in linhasFiltradas"
                  :key="item.ibge"
                  :class="{ 'mun-linha-sem-dado': !item.temDados }"
                  @click="abrirModal(item)"
                >
                  <td>
                    <span
                      class="mun-pos"
                      :class="{ 'mun-pos--top': item.temDados && item.posicao <= 3 }"
                    >
                      {{ item.temDados ? item.posicao : '—' }}
                    </span>
                  </td>
                  <td>
                    <strong>{{ item.nome }}</strong>
                  </td>
                  <td class="pg-mono">{{ item.ibge }}</td>

                  <template v-if="item.temDados">
                    <td class="num">
                      <strong>
                        {{ fmtNumero(item.valor) }}{{ ehPercentual ? '%' : '' }}
                      </strong>
                    </td>
                    <td>
                      <span class="mun-faixa-celula">
                        <i
                          class="mun-fdot"
                          :style="{
                            background: corDaQualidade(
                              item.pos,
                              faixasInfo.lista.length
                            ),
                          }"
                        />
                        {{ item.faixaRotulo }}
                      </span>
                    </td>
                    <td class="num">{{ fmtInteiro(item.imoveis) }}</td>
                    <td class="num">{{ fmtNumero(item.pctConf, 1) }}%</td>
                    <td class="num">{{ fmtNumero(item.ha, 1) }}</td>
                  </template>

                  <td v-else colspan="5" class="num mun-sem-dado-texto">
                    sem resultado nesta versão
                  </td>
                </tr>
              </template>

              <tr v-else>
                <td colspan="8" class="pg-vazio">
                  Nenhum município encontrado.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>

    <ModalDetalheMunicipio
      :municipio="municipioSelecionado"
      :sigla="sigla"
      :eh-percentual="ehPercentual"
      :total-com-dados="resumo.comDados"
      :total-faixas="faixasInfo.lista.length"
      :cor-faixa="
        municipioSelecionado
          ? corDaQualidade(municipioSelecionado.pos, faixasInfo.lista.length)
          : ''
      "
      @fechar="fecharModal"
      @ver-mapa="verNoMapa"
    />
  </div>
</template>

<style scoped src="../assets/css/comparacao-municipios.css"></style>
