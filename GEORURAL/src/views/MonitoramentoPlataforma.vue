<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import BarraNavegacao from '../components/BarraNavegacao.vue'

defineOptions({
  name: 'MonitoramentoPlataforma',
})

const LIMITE_SEG = 3

const EST = {
  NO_AR: { rot: 'No ar', cls: 'mon-estado--ok' },
  FORA: { rot: 'Fora', cls: 'mon-estado--bad' },
  DEGRADADO: { rot: 'Degradado', cls: 'mon-estado--warn' },
  NAO_CONFIGURADO: { rot: 'Não configurado', cls: 'mon-estado--na' },
}

const live = ref(false)
const janelaMinutos = ref(60)
const buscaErro = ref('')
const ultimaLeitura = ref('')

const carregando = ref(false)
const componentes = ref([])
const recursos = ref([])
const rotas = ref([])
const erros = ref([])

let timer = null

const rotasOrdenadas = computed(() =>
  [...rotas.value].sort((a, b) => (b.max ?? 0) - (a.max ?? 0))
)

const qtdRotasLentas = computed(
  () => rotasOrdenadas.value.filter((r) => (r.max ?? 0) > LIMITE_SEG).length
)

const errosFiltrados = computed(() => {
  const termo = buscaErro.value.trim().toLowerCase()
  if (!termo) return erros.value
  return erros.value.filter((e) =>
    `${e.msg ?? ''} ${e.rota ?? ''} ${e.status ?? ''} ${e.origem ?? ''}`
      .toLowerCase()
      .includes(termo)
  )
})

const contagemMensagensErro = computed(() => {
  const mapa = {}
  for (const e of erros.value) {
    if (e.msg) {
      mapa[e.msg] = (mapa[e.msg] || 0) + 1
    }
  }
  return mapa
})

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

function percentualRecurso(rec) {
  if (!rec || !rec.max) return 0
  return Math.min(100, Math.max(0, (rec.v / rec.max) * 100))
}

function corRecurso(rec) {
  const pct = percentualRecurso(rec)
  if (pct > 85) return 'var(--cor-erro, #f87171)'
  if (pct > 65) return '#fbbf24'
  return 'var(--cor-sucesso, #34d399)'
}

function partirDestaque(texto, termo) {
  const valor = String(texto ?? '')
  const q = termo.trim()
  if (!q) return { antes: valor, meio: '', depois: '' }
  const idx = valor.toLowerCase().indexOf(q.toLowerCase())
  if (idx < 0) return { antes: valor, meio: '', depois: '' }
  return {
    antes: valor.slice(0, idx),
    meio: valor.slice(idx, idx + q.length),
    depois: valor.slice(idx + q.length),
  }
}

async function consultarMonitoramento() {
  carregando.value = true
  try {
    ultimaLeitura.value = new Date().toLocaleTimeString('pt-BR')
  } finally {
    carregando.value = false
  }
}

async function consultarErros() {
  try {//
  } catch {//
  }
}

function alternarLive() {
  live.value = !live.value
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  if (live.value) {
    timer = setInterval(consultarMonitoramento, 10000)
    consultarMonitoramento()
  }
}

onMounted(() => {
  consultarMonitoramento()
})

onBeforeUnmount(() => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
})
</script>

<template>
  <div class="pg-layout">
    <BarraNavegacao />

    <main class="pg-pagina">
      <header class="pg-cabecalho">
        <h1>Saúde da plataforma</h1>
        <p>
          Os cinco componentes, o que eles estão consumindo e o que andou devagar
          ou quebrou no ambiente monitorado.
        </p>
      </header>

      <section class="pg-filtros" aria-label="Controles de monitoramento">
        <button
          type="button"
          class="mon-live"
          :class="{ 'mon-live--on': live }"
          @click="alternarLive"
        >
          <i class="mon-pulse mon-pulse--ok" />
          <span>{{ live ? 'Atualizando a cada 10s' : 'Atualizar a cada 10s' }}</span>
        </button>

        <label class="pg-campo">
          <span>Janela</span>
          <select v-model.number="janelaMinutos" @change="consultarMonitoramento">
            <option :value="15">Últimos 15 min</option>
            <option :value="60">Última hora</option>
            <option :value="1440">Últimas 24h</option>
          </select>
        </label>

        <span v-if="ultimaLeitura" class="mon-ultima-leitura">
          Última leitura {{ ultimaLeitura }}{{ live ? ' · automático' : '' }}
        </span>
      </section>

      <section class="mon-comps" aria-label="Estado dos componentes">
        <article
          v-for="comp in componentes"
          :key="comp.nome"
          class="pg-bloco mon-comp"
          :class="EST[comp.estado]?.cls"
        >
          <h3>
            <i class="mon-pulse" :class="EST[comp.estado]?.cls" />
            {{ comp.nome }}
          </h3>
          <span class="mon-comp-qual">{{ comp.qual }}</span>
          <strong class="mon-comp-valor">
            <template v-if="comp.ms !== null && comp.ms !== undefined">
              {{ fmtInteiro(comp.ms) }} <small>ms</small>
            </template>
            <span v-else class="mon-comp-vazio">—</span>
          </strong>
          <span class="mon-comp-rodape">
            <template v-if="comp.estado === 'NAO_CONFIGURADO'">
              não configurado neste ambiente
            </template>
            <template v-else-if="comp.estado === 'DEGRADADO'">
              respondeu, mas acima de 2s
            </template>
            <template v-else-if="comp.estado === 'FORA'">
              componente indisponível
            </template>
            <template v-else>
              verificado agora
            </template>
          </span>
        </article>
      </section>

      <section class="pg-bloco">
        <div class="pg-bloco-topo">
          <div>
            <h2>Consumo de recursos</h2>
            <p class="mon-bloco-sub">
              CPU e memória da JVM; o acervo sai do catálogo
              <span class="pg-mono">ARQUIVO_BRUTO</span>, não do bucket
            </p>
          </div>
        </div>

        <div v-if="recursos.length" class="mon-recursos">
          <div v-for="rec in recursos" :key="rec.k" class="mon-recurso-item">
            <div class="mon-recurso-topo">
              <span class="mon-recurso-nome">{{ rec.k }}</span>
              <strong class="mon-recurso-valor">
                {{ fmtNumero(rec.v, Number.isInteger(rec.v) ? 0 : 1) }}
                <small>{{ rec.un === '%' ? '%' : ` ${rec.un}` }}</small>
              </strong>
            </div>
            <div class="mon-recurso-trilho">
              <i
                :style="{
                  width: `${percentualRecurso(rec)}%`,
                  background: corRecurso(rec),
                }"
              />
            </div>
            <span class="mon-recurso-desc">{{ rec.q }}</span>
          </div>
        </div>
        <p v-else class="pg-vazio">Nenhum dado de consumo disponível.</p>
      </section>

      <section class="pg-bloco">
        <div class="pg-bloco-topo">
          <div>
            <h2>Tempo de resposta por rota</h2>
            <p class="mon-bloco-sub">
              Ordenado pelo pior caso · limite de <strong>{{ LIMITE_SEG }}s</strong> para a API pública
            </p>
          </div>

          <span
            v-if="qtdRotasLentas > 0"
            class="pg-selo mon-selo-alerta"
          >
            <i class="mon-dot" />
            {{ qtdRotasLentas }} rota(s) acima de {{ LIMITE_SEG }}s
          </span>
        </div>

        <div class="pg-rolagem">
          <table class="pg-tabela">
            <thead>
              <tr>
                <th>Rota</th>
                <th class="num">Chamadas</th>
                <th class="num">Médio</th>
                <th class="num">Máximo</th>
                <th class="num">Erros</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="carregando">
                <td colspan="5" class="pg-vazio">Carregando desempenho...</td>
              </tr>

              <template v-else-if="rotasOrdenadas.length">
                <tr
                  v-for="r in rotasOrdenadas"
                  :key="r.rota"
                  :class="{ 'mon-linha-lenta': (r.max ?? 0) > LIMITE_SEG }"
                >
                  <td>
                    <span class="pg-mono mon-rota-texto">{{ r.rota }}</span>
                    <span
                      v-if="(r.max ?? 0) > LIMITE_SEG"
                      class="mon-limite-tag"
                    >
                      · {{ (r.max / LIMITE_SEG).toFixed(1) }}× o limite
                    </span>
                  </td>
                  <td class="num">{{ fmtInteiro(r.n) }}</td>
                  <td class="num">{{ fmtNumero(r.med) }}s</td>
                  <td
                    class="num"
                    :class="{ 'mon-texto-erro': (r.max ?? 0) > LIMITE_SEG }"
                  >
                    <strong>{{ fmtNumero(r.max) }}s</strong>
                  </td>
                  <td
                    class="num"
                    :class="{
                      'mon-texto-aviso': (r.err ?? 0) > 0,
                      'mon-texto-neutro': !(r.err ?? 0),
                    }"
                  >
                    {{ fmtInteiro(r.err) }}
                  </td>
                </tr>
              </template>

              <tr v-else>
                <td colspan="5" class="pg-vazio">
                  Nenhuma métrica de rota registrada na janela.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="pg-bloco">
        <div class="pg-bloco-topo">
          <h2>Erros recentes</h2>
          <span>{{ fmtInteiro(errosFiltrados.length) }} ocorrência(s)</span>
        </div>

        <div class="mon-erro-busca">
          <input
            v-model="buscaErro"
            type="search"
            placeholder="Buscar na mensagem, na rota ou no código…"
            @input="consultarErros"
          />
        </div>

        <div v-if="carregando" class="pg-vazio">Carregando erros...</div>

        <div v-else-if="errosFiltrados.length" class="mon-erros-lista">
          <div
            v-for="(erro, idx) in errosFiltrados"
            :key="`${erro.h}-${erro.rota}-${idx}`"
            class="mon-erro-item"
          >
            <span class="mon-erro-hora">{{ erro.h }}</span>
            <span
              class="mon-status-badge"
              :class="erro.status >= 500 ? 'mon-status-badge--e5' : 'mon-status-badge--e4'"
            >
              {{ erro.status }}
            </span>

            <div class="mon-erro-conteudo">
              <div class="mon-erro-msg">
                <template v-if="buscaErro.trim()">
                  {{ partirDestaque(erro.msg, buscaErro).antes }}<mark
                    v-if="partirDestaque(erro.msg, buscaErro).meio"
                    class="mon-destaque"
                  >{{ partirDestaque(erro.msg, buscaErro).meio }}</mark>{{ partirDestaque(erro.msg, buscaErro).depois }}
                </template>
                <template v-else>
                  {{ erro.msg }}
                </template>
              </div>

              <div class="mon-erro-origem">
                <span class="pg-mono">{{ erro.rota }}</span> · {{ erro.origem }}
                <template v-if="(contagemMensagensErro[erro.msg] ?? 0) > 1">
                  ·
                  <strong class="mon-texto-aviso">
                    {{ contagemMensagensErro[erro.msg] }}× na janela
                  </strong>
                </template>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="pg-vazio">
          <template v-if="buscaErro.trim()">
            Nenhum erro encontrado com "{{ buscaErro }}".
          </template>
          <template v-else>
            Nenhum erro registrado na janela selecionada.
          </template>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped src="../assets/css/monitoramento.css"></style>
