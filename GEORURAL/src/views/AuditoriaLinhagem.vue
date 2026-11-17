<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import BarraNavegacao from '../components/BarraNavegacao.vue'
import ModalDetalheAuditoria from '../components/ModalDetalheAuditoria.vue'

defineOptions({
  name: 'AuditoriaLinhagem',
})

const route = useRoute()

const OPERACOES = {
  INSERT: 'Criou',
  UPDATE: 'Alterou',
  DELETE: 'Apagou',
  LOGIN: 'Entrou',
  LOGOUT: 'Saiu',
  EXPORT: 'Exportou',
  DOWNLOAD: 'Baixou',
  API_ACCESS: 'Chamou a API',
}

const ENTIDADES = [
  'VERSAO',
  'REGRA_CALCULO',
  'PARAMETRO_REGRA_CALCULO',
  'ARQUIVO_BRUTO',
  'CONJUNTO_DADOS',
  'EXECUCAO_PIPELINE',
  'USUARIO',
  'FONTE_DO_DADO',
]

const dias = ref(7)
const operacao = ref('')
const entidade = ref('')
const responsavel = ref('')
const busca = ref('')

const carregando = ref(false)
const eventos = ref([])
const eventoSelecionado = ref(null)

const responsaveisDisponiveis = computed(() => {
  const mapa = new Map()
  for (const e of eventos.value) {
    if (e.usuario?.nome && !mapa.has(e.usuario.nome)) {
      mapa.set(e.usuario.nome, e.usuario)
    }
  }
  return Array.from(mapa.values())
})

const eventosFiltrados = computed(() => {
  const termo = busca.value.trim().toLowerCase()
  return eventos.value.filter((e) => {
    if (operacao.value && e.operacao !== operacao.value) return false
    if (entidade.value && e.entidade !== entidade.value) return false
    if (responsavel.value && e.usuario?.nome !== responsavel.value) return false
    if (!termo) return true

    const texto = `${e.usuario?.nome ?? ''} ${e.operacao} ${e.entidade} ${
      e.resumo ?? ''
    } ${e.usuario?.ip ?? ''} ${JSON.stringify(e.antigos ?? {})} ${JSON.stringify(
      e.novos ?? {}
    )}`
    return texto.toLowerCase().includes(termo)
  })
})

const resumo = computed(() => {
  const lista = eventosFiltrados.value
  const mudancas = lista.filter((e) =>
    ['INSERT', 'UPDATE', 'DELETE'].includes(e.operacao)
  ).length
  const responsaveisUnicos = new Set(
    lista.map((e) => e.usuario?.nome).filter(Boolean)
  ).size
  const peloAirflow = lista.filter((e) => e.usuario?.automatico).length
  const exclusoes = lista.filter((e) => e.operacao === 'DELETE').length

  return {
    total: lista.length,
    mudancas,
    responsaveisUnicos,
    peloAirflow,
    exclusoes,
  }
})

const gruposPorDia = computed(() => {
  const grupos = []
  const mapa = new Map()

  for (const e of eventosFiltrados.value) {
    const d = e.quando instanceof Date ? e.quando : new Date(e.quando)
    const chave = Number.isNaN(d.getTime())
      ? 'sem-data'
      : d.toISOString().slice(0, 10)

    if (!mapa.has(chave)) {
      const novoGrupo = {
        chave,
        dataRef: d,
        itens: [],
      }
      mapa.set(chave, novoGrupo)
      grupos.push(novoGrupo)
    }
    mapa.get(chave).itens.push(e)
  }

  return grupos
})

const eventoMaisAntigo = computed(() => {
  if (!eventosFiltrados.value.length) return null
  return eventosFiltrados.value[eventosFiltrados.value.length - 1]
})

function fmtHora(valor) {
  if (!valor) return '—'
  const d = valor instanceof Date ? valor : new Date(valor)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function fmtDiaCabecalho(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return 'Data desconhecida'
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })
}

function fmtDataCompleta(valor) {
  if (!valor) return '—'
  const d = valor instanceof Date ? valor : new Date(valor)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function fmtInteiro(v) {
  if (v === null || v === undefined) return '—'
  return Number(v).toLocaleString('pt-BR')
}

async function consultarAuditoria() {
  carregando.value = true
  try {//
  } finally {
    carregando.value = false
  }
}

function abrirModal(evento) {
  eventoSelecionado.value = evento
}

function fecharModal() {
  eventoSelecionado.value = null
}

onMounted(async () => {
  if (route.query.arquivoBrutoId) {
    busca.value = String(route.query.arquivoBrutoId)
  }
  await consultarAuditoria()
})
</script>

<template>
  <div class="pg-layout">
    <BarraNavegacao />

    <main class="pg-pagina">
      <header class="pg-cabecalho">
        <h1>Quem fez o quê, e quando</h1>
        <p>
          Tudo que aconteceu na plataforma, na ordem em que aconteceu — envio de
          arquivo, mudança de regra, execução, publicação, download e acesso à API.
          Cada linha guarda o responsável, o IP e o estado antes e depois.
        </p>
      </header>

      <section class="pg-filtros" aria-label="Filtros da auditoria">
        <label class="pg-campo aud-campo-busca">
          <span>Buscar</span>
          <input
            v-model="busca"
            type="search"
            placeholder="Buscar por responsável, entidade ou conteúdo…"
          />
        </label>

        <label class="pg-campo">
          <span>Período</span>
          <select v-model.number="dias" @change="consultarAuditoria">
            <option :value="1">Últimas 24h</option>
            <option :value="7">Últimos 7 dias</option>
            <option :value="30">Últimos 30 dias</option>
            <option :value="0">Todo o período</option>
          </select>
        </label>

        <label class="pg-campo">
          <span>Operação</span>
          <select v-model="operacao">
            <option value="">Qualquer operação</option>
            <option v-for="(rot, op) in OPERACOES" :key="op" :value="op">
              {{ op }} — {{ rot }}
            </option>
          </select>
        </label>

        <label class="pg-campo">
          <span>Entidade</span>
          <select v-model="entidade">
            <option value="">Qualquer entidade</option>
            <option v-for="ent in ENTIDADES" :key="ent" :value="ent">
              {{ ent }}
            </option>
          </select>
        </label>

        <label class="pg-campo">
          <span>Responsável</span>
          <select v-model="responsavel">
            <option value="">Qualquer responsável</option>
            <option
              v-for="u in responsaveisDisponiveis"
              :key="u.nome"
              :value="u.nome"
            >
              {{ u.nome }}{{ u.automatico ? ' (automático)' : '' }}
            </option>
          </select>
        </label>
      </section>

      <section class="aud-kpis" aria-label="Resumo da auditoria">
        <article class="pg-bloco aud-kpi">
          <span class="aud-kpi-k">Ações</span>
          <strong class="aud-kpi-v">{{ fmtInteiro(resumo.total) }}</strong>
          <span class="aud-kpi-m">
            {{
              dias
                ? `nos últimos ${dias} dia(s)`
                : 'desde o início da plataforma'
            }}
          </span>
        </article>

        <article class="pg-bloco aud-kpi">
          <span class="aud-kpi-k">Mudanças de estado</span>
          <strong class="aud-kpi-v">{{ fmtInteiro(resumo.mudancas) }}</strong>
          <span class="aud-kpi-m">INSERT, UPDATE e DELETE</span>
        </article>

        <article class="pg-bloco aud-kpi">
          <span class="aud-kpi-k">Responsáveis</span>
          <strong class="aud-kpi-v">
            {{ fmtInteiro(resumo.responsaveisUnicos) }}
          </strong>
          <span class="aud-kpi-m">pessoas e integrações</span>
        </article>

        <article class="pg-bloco aud-kpi">
          <span class="aud-kpi-k">Pelo Airflow</span>
          <strong class="aud-kpi-v">{{ fmtInteiro(resumo.peloAirflow) }}</strong>
          <span class="aud-kpi-m">sem disparo manual</span>
        </article>

        <article
          class="pg-bloco aud-kpi"
          :class="{ 'aud-kpi--alerta': resumo.exclusoes > 0 }"
        >
          <span class="aud-kpi-k">Exclusões</span>
          <strong class="aud-kpi-v">{{ fmtInteiro(resumo.exclusoes) }}</strong>
          <span class="aud-kpi-m">sempre guardam o estado anterior</span>
        </article>
      </section>

      <p
        v-if="!dias && eventosFiltrados.length && eventoMaisAntigo"
        class="aud-alcance"
      >
        Mostrando <strong>{{ fmtInteiro(eventosFiltrados.length) }}</strong>
        ação(ões), a mais antiga de
        <strong>{{ fmtDataCompleta(eventoMaisAntigo.quando) }}</strong>.
      </p>

      <div v-if="carregando" class="pg-bloco">
        <p class="pg-vazio">Carregando trilha de auditoria...</p>
      </div>

      <template v-else-if="gruposPorDia.length">
        <section
          v-for="grupo in gruposPorDia"
          :key="grupo.chave"
          class="aud-dia"
        >
          <div class="aud-dia-topo">
            <span class="aud-dia-titulo">
              {{ fmtDiaCabecalho(grupo.dataRef) }}
            </span>
            <span class="aud-dia-contagem">
              {{ fmtInteiro(grupo.itens.length) }} ação(ões)
            </span>
            <span class="aud-dia-linha" />
          </div>

          <div
            v-for="ev in grupo.itens"
            :key="ev.id"
            class="aud-ev"
            :class="{ 'aud-ev--marco': ev.marco }"
            @click="abrirModal(ev)"
          >
            <span class="aud-hora">{{ fmtHora(ev.quando) }}</span>

            <span class="aud-op" :class="`aud-op--${ev.operacao}`">
              {{ ev.operacao }}
            </span>

            <div class="aud-txt">
              <div class="aud-resumo">{{ ev.resumo }}</div>
              <div class="aud-sub">
                {{ ev.entidade
                }}<template
                  v-if="ev.registroId !== null && ev.registroId !== undefined"
                >
                  · id {{ ev.registroId }}
                </template>
              </div>
            </div>

            <div class="aud-quem">
              <div class="aud-quem-nome">
                {{ ev.usuario?.nome }}
                <span v-if="ev.usuario?.automatico" class="aud-auto">auto</span>
              </div>
              <div class="pg-mono aud-quem-ip">{{ ev.usuario?.ip }}</div>
            </div>
          </div>
        </section>
      </template>

      <div v-else class="pg-bloco">
        <p class="pg-vazio">
          Nenhuma ação encontrada com esses filtros. A trilha é apenas de leitura:
          se não há registo, a ação não ocorreu nesta janela.
        </p>
      </div>
    </main>

    <ModalDetalheAuditoria
      :evento="eventoSelecionado"
      @fechar="fecharModal"
    />
  </div>
</template>

<style scoped src="../assets/css/auditoria-linhagem.css"></style>
