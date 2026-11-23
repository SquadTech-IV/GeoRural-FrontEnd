<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import BarraNavegacao from '../components/BarraNavegacao.vue'
import ModalEtapasExecucao from '../components/ModalEtapasDeExecucao.vue'
import { operacaoService } from '../services/PainelOperacaoService'

const PASSO_LIMITE = 50
const periodo = ref('7')
const situacao = ref('')
const conjuntoId = ref('')
const limite = ref(PASSO_LIMITE)

const conjuntos = ref([])
const resumo = ref(null)
const execucoes = ref([])

const carregando = ref(false)
const erro = ref('')

const execucaoAberta = ref(null)

let sequencia = 0

const fmt = (n) => Number(n ?? 0).toLocaleString('pt-BR')

function fmtData(valor) {
  if (!valor) return '—'
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return String(valor)
  return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function apresentarSituacao(valor) {
  const mapa = {
    CONCLUIDA: ['sucesso', 'Concluída'],
    COM_RESSALVA: ['aviso', 'Com ressalva'],
    FALHOU: ['erro', 'Falhou'],
    EM_ANDAMENTO: ['roxo', 'Em andamento'],
    PENDENTE: ['roxo', 'Aguardando'],
    NAO_RODOU: ['neutro', 'Não rodou'],
  }

  const [classe, texto] = mapa[valor] ?? ['neutro', valor || '—']
  return { classe, texto }
}

const filtroBack = computed(() => (situacao.value === 'FALHOU' ? 'FALHADAS' : 'TODAS'))

const lista = computed(() =>
  execucoes.value.filter((e) =>
    !situacao.value || situacao.value === 'FALHOU' || e.situacao === situacao.value
  )
)

async function carregar() {
  const minha = ++sequencia
  const id = conjuntoId.value || undefined

  carregando.value = true
  erro.value = ''

  try {
    const [resposta, rodadas] = await Promise.all([
      operacaoService.resumo({ conjuntoId: id, dias: Number(periodo.value) }),
      operacaoService.execucoes({
        conjuntoId: id,
        filtro: filtroBack.value,
        limite: limite.value,
        dias: Number(periodo.value),
      }),
    ])

    if (minha !== sequencia) return

    resumo.value = resposta
    execucoes.value = rodadas
  } catch (e) {
    if (minha !== sequencia) return
    erro.value = e.message
  } finally {
    if (minha === sequencia) carregando.value = false
  }
}

async function carregarConjuntos() {
  try {
    conjuntos.value = await operacaoService.conjuntos()
  } catch {
    conjuntos.value = []
  }
}

watch([periodo, situacao, conjuntoId], () => {
  limite.value = PASSO_LIMITE
  carregar()
})

function carregarMais() {
  limite.value += PASSO_LIMITE
  carregar()
}
const falhaMaisAntiga = computed(() => {
  const data = resumo.value?.falhaMaisAntiga
  if (!data) return 'nenhuma falha no período'

  const dias = Math.floor((Date.now() - new Date(data).getTime()) / 86400000)
  if (dias <= 0) return 'a mais antiga é de hoje'
  return `a mais antiga há ${dias} dia${dias === 1 ? '' : 's'}`
})

const haMais = computed(() => execucoes.value.length >= limite.value)
const abrir = (execucao) => { execucaoAberta.value = execucao }
const fechar = () => { execucaoAberta.value = null }

onMounted(() => {
  carregarConjuntos()
  carregar()
})

onBeforeUnmount(() => {
  sequencia++
})
</script>

<template>
  <div>
    <BarraNavegacao />

    <main class="pg-pagina">
      <header class="pg-cabecalho">
        <h1>Painel da operação</h1>
      </header>

      <section class="pg-filtros" aria-label="Filtros do painel">
        <label class="pg-campo">
          <span>Período</span>
          <select v-model="periodo">
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
          </select>
        </label>

        <label class="pg-campo">
          <span>Situação</span>
          <select v-model="situacao">
            <option value="">Todas</option>
            <option value="FALHOU">Só as que falharam</option>
            <option value="COM_RESSALVA">Com ressalva</option>
            <option value="CONCLUIDA">Concluídas</option>
          </select>
        </label>

        <label class="pg-campo">
          <span>Conjunto</span>
          <select v-model="conjuntoId">
            <option value="">Todos</option>
            <option v-for="c in conjuntos" :key="c.id" :value="c.id">{{ c.nome }}</option>
          </select>
        </label>

        <button type="button" class="pg-botao" :disabled="carregando" @click="carregar">
          {{ carregando ? 'Atualizando...' : 'Atualizar' }}
        </button>
      </section>

      <p v-if="erro" class="pg-erro" role="alert">{{ erro }}</p>

      <section v-if="resumo" class="pg-cards" aria-label="Resumo da operação">
        <article>
          <strong>{{ fmt(resumo.conjuntosPublicados) }}</strong>
          <span>conjuntos publicados</span>
          <small>com versão vigente</small>
        </article>

        <article>
          <strong>{{ fmt(resumo.execucoes) }}</strong>
          <span>execuções no período</span>
          <small>{{ fmt(resumo.execucoesAutomaticas) }} automáticas, {{ fmt(resumo.execucoesManuais) }} manuais</small>
        </article>

        <article :class="{ 'pg-card--alerta': resumo.execucoesFalhadas }">
          <strong>{{ fmt(resumo.execucoesFalhadas) }}</strong>
          <span>falharam</span>
          <small>{{ falhaMaisAntiga }}</small>
        </article>

        <article>
          <strong>{{ fmt(resumo.quarentenaPendente) }}</strong>
          <span>na quarentena</span>
          <small>pendentes de resolução</small>
        </article>

        <article>
          <strong>{{ resumo.duracaoMedia || '—' }}</strong>
          <span>duração média</span>
          <small>da rodada completa</small>
        </article>
      </section>

      <section class="pg-bloco" :aria-busy="carregando">
        <div class="pg-bloco-topo">
          <h2>Execuções do pipeline</h2>
          <span>{{ lista.length }} {{ lista.length === 1 ? 'execução' : 'execuções' }}</span>
        </div>

        <div class="pg-rolagem">
          <table class="pg-tabela">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Conjunto e arquivo</th>
                <th>Origem</th>
                <th class="num">Feições</th>
                <th class="num">Rejeitadas</th>
                <th>Versão</th>
                <th>Situação</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="e in lista" :key="e.dagRunId" @click="abrir(e)">
                <td>{{ fmtData(e.inicio) }}</td>

                <td><strong>{{ e.conjuntoNome || '—' }}</strong></td>

                <td>{{ e.automatica ? (e.canalEntrada || 'pipeline') : 'pela tela' }}</td>

                <td class="num">{{ fmt(e.recebidas) }}</td>
                <td class="num">{{ fmt(e.rejeitadas) }}</td>
                <td>{{ e.versaoNumero ? `#${e.versaoNumero}` : '—' }}</td>

                <td>
                  <span class="pg-selo" :class="`pg-selo--${apresentarSituacao(e.situacao).classe}`">
                    {{ apresentarSituacao(e.situacao).texto }}
                  </span>
                </td>
              </tr>

              <tr v-if="carregando && !lista.length" class="pg-linha-vazia">
                <td colspan="7" class="pg-vazio">Carregando execuções...</td>
              </tr>

              <tr v-else-if="!lista.length" class="pg-linha-vazia">
                <td colspan="7" class="pg-vazio">Nenhuma execução neste filtro.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer class="pg-rodape">
          <span>Mostrando as {{ lista.length }} execuções mais recentes do período.</span>
          <button type="button" class="pg-botao" :disabled="!haMais || carregando" @click="carregarMais">
            Carregar mais
          </button>
        </footer>
      </section>
    </main>

    <ModalEtapasExecucao v-if="execucaoAberta" :execucao="execucaoAberta" @fechar="fechar"
      @reprocessado="carregar" />
  </div>
</template>

<style scoped src="../assets/css/painel-operacao.css"></style>
