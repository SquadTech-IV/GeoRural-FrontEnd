<script setup>
import { computed, onMounted, ref } from 'vue'
import BarraNavegacao from '../components/BarraNavegacao.vue'

defineOptions({
  name: 'DocumentacaoApi',
})

const urlBase = ref(import.meta.env.VITE_API_URL || '')
const grupos = ref([])
const convencoes = ref([])
const tetoPorPagina = ref(null)
const limiteRespostaSegundos = ref(null)

const carregando = ref(false)
const busca = ref('')
const grupoSelecionado = ref('')
const copiado = ref(false)

const totalRotas = computed(() =>
  grupos.value.reduce((acc, g) => acc + (g.rotas?.length ?? 0), 0)
)

const gruposFiltrados = computed(() => {
  const termo = busca.value.trim().toLowerCase()
  return grupos.value
    .filter((g) => !grupoSelecionado.value || g.tag === grupoSelecionado.value)
    .map((g) => ({
      ...g,
      rotasFiltradas: (g.rotas ?? []).filter(
        (r) => !termo || `${r.p} ${r.d}`.toLowerCase().includes(termo)
      ),
    }))
    .filter((g) => g.rotasFiltradas.length > 0)
})

function partesCaminho(path) {
  return path.split(/(\{[^}]+\})/g).filter(Boolean)
}

async function carregarDocumentacao() {
  carregando.value = true
  try {//
  } finally {
    carregando.value = false
  }
}

async function copiarBase() {
  if (!urlBase.value) return
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(urlBase.value).catch(() => {})
  }
  copiado.value = true
  setTimeout(() => {
    copiado.value = false
  }, 2000)
}

function abrirDocumentacao(caminho) {
  const origem = urlBase.value.replace(/\/api\/v1\/?$/, '')
  window.open(`${origem}${caminho}`, '_blank', 'noopener,noreferrer')
}

onMounted(() => {
  carregarDocumentacao()
})
</script>

<template>
  <div class="pg-layout">
    <BarraNavegacao />

    <main class="pg-pagina">
      <header class="pg-cabecalho">
        <div class="doc-topo-titulo">
          <h1>API de consulta</h1>
        </div>
        <p>
          Catálogo, dados, indicadores, versões, qualidade, linhagem e execuções
          em <span class="pg-mono">/api/v1</span>. Acesse o Swagger para
          consultar os schemas completos e testar os endpoints.
        </p>
      </header>

      <section class="pg-bloco doc-hero">
        <h2>Especificação OpenAPI</h2>
        <p>
          Consulte os parâmetros, schemas de resposta e realize testes
          autenticados através do botão <strong>Authorize</strong>.
        </p>

        <div class="doc-base">
          <span class="doc-base-rotulo">base</span>
          <code class="pg-mono">{{ urlBase || '—' }}</code>
          <button
            type="button"
            class="pg-botao doc-btn-copiar"
            :disabled="!urlBase"
            @click="copiarBase"
          >
            {{ copiado ? 'Copiado!' : 'Copiar' }}
          </button>
        </div>

        <div class="doc-acoes">
          <button
            type="button"
            class="pg-botao pg-botao--principal"
            :disabled="!urlBase"
            @click="abrirDocumentacao('/swagger-ui/index.html')"
          >
            Abrir o Swagger UI ↗
          </button>
          <button
            type="button"
            class="pg-botao"
            :disabled="!urlBase"
            @click="abrirDocumentacao('/v3/api-docs')"
          >
            Baixar o OpenAPI (JSON)
          </button>
        </div>
      </section>

      <section class="doc-metricas" aria-label="Resumo técnico da API">
        <article class="pg-bloco doc-metrica">
          <span class="doc-metrica-k">Rotas</span>
          <strong class="doc-metrica-v">{{ totalRotas }}</strong>
          <span class="doc-metrica-m">endpoints de leitura</span>
        </article>

        <article class="pg-bloco doc-metrica">
          <span class="doc-metrica-k">Grupos</span>
          <strong class="doc-metrica-v">{{ grupos.length }}</strong>
          <span class="doc-metrica-m">domínios da API</span>
        </article>

        <article class="pg-bloco doc-metrica">
          <span class="doc-metrica-k">Teto por página</span>
          <strong class="doc-metrica-v">{{ tetoPorPagina ?? '—' }}</strong>
          <span class="doc-metrica-m">itens por resposta</span>
        </article>

        <article class="pg-bloco doc-metrica">
          <span class="doc-metrica-k">Limite de resposta</span>
          <strong class="doc-metrica-v">
            {{ limiteRespostaSegundos != null ? `${limiteRespostaSegundos}s` : '—' }}
          </strong>
          <span class="doc-metrica-m">tempo máximo esperado</span>
        </article>
      </section>

      <section class="pg-filtros" aria-label="Filtros das rotas">
        <label class="pg-campo doc-campo-busca">
          <span>Buscar</span>
          <input
            v-model="busca"
            type="search"
            placeholder="Buscar rota ou descrição…"
          />
        </label>

        <label class="pg-campo">
          <span>Grupo</span>
          <select v-model="grupoSelecionado">
            <option value="">Todos os grupos</option>
            <option v-for="g in grupos" :key="g.tag" :value="g.tag">
              {{ g.tag }} ({{ g.rotas?.length ?? 0 }})
            </option>
          </select>
        </label>
      </section>

      <section v-if="carregando" class="pg-bloco pg-vazio">
        Carregando rotas da API...
      </section>

      <section v-else-if="gruposFiltrados.length" class="doc-grupos">
        <div
          v-for="grupo in gruposFiltrados"
          :key="grupo.tag"
          class="doc-grupo"
        >
          <header class="doc-grupo-cabecalho">
            <div>
              <h2>{{ grupo.tag }}</h2>
              <span class="doc-grupo-meta">
                {{ grupo.rotasFiltradas.length
                }}<template v-if="grupo.rotasFiltradas.length !== grupo.rotas.length">
                  de {{ grupo.rotas.length }}
                </template>
                rota(s)
              </span>
            </div>
            <p>{{ grupo.desc }}</p>
          </header>

          <div class="doc-lista-rotas">
            <article
              v-for="rota in grupo.rotasFiltradas"
              :key="rota.p"
              class="doc-rota"
            >
              <span class="pg-selo pg-selo--sucesso doc-verbo">GET</span>
              <span class="pg-mono doc-caminho">
                /api/v1<template
                  v-for="(parte, idx) in partesCaminho(rota.p)"
                  :key="idx"
                ><em v-if="parte.startsWith('{')" class="doc-param">{{ parte }}</em><template v-else>{{ parte }}</template></template>
              </span>
              <span class="doc-descricao">{{ rota.d }}</span>
              <span v-if="rota.t" class="doc-tag-tipo">{{ rota.t }}</span>
            </article>
          </div>
        </div>
      </section>

      <section v-else class="pg-bloco pg-vazio">
        <template v-if="busca">
          Nenhuma rota encontrada com "{{ busca }}".
        </template>
        <template v-else>
          Nenhuma rota disponível.
        </template>
      </section>

      <section class="pg-bloco doc-secao">
        <div class="pg-bloco-topo">
          <h2>Autenticação</h2>
        </div>
        <p class="doc-texto-apoio">
          Todas as rotas de <span class="pg-mono">/api/v1</span> exigem
          <strong>bearer token</strong> no cabeçalho
          <span class="pg-mono">Authorization</span> utilizando o esquema
          <span class="pg-mono">bearerAuth</span>.
        </p>

        <ol class="doc-passos">
          <li>
            <strong>Solicite as credenciais do cliente</strong>
            <span>
              Obtenha um <span class="pg-mono">client_id</span> e um
              <span class="pg-mono">client_secret</span> do realm
              <span class="pg-mono">georural</span> no Keycloak junto ao
              administrador.
            </span>
          </li>
          <li>
            <strong>Gere o token de acesso no Keycloak</strong>
            <span>
              Envie um <span class="pg-mono">POST</span> para o endpoint de
              token do realm com
              <span class="pg-mono">grant_type=client_credentials</span> para
              receber o JWT e seu tempo de expiração.
            </span>
          </li>
          <li>
            <strong>Envie o token nas requisições</strong>
            <span>
              Inclua o cabeçalho
              <span class="pg-mono">Authorization: Bearer</span>
              em todas as chamadas. Requisições sem token retornam
              <strong>401</strong> e sem permissão retornam
              <strong>403</strong>.
            </span>
          </li>
          <li>
            <strong>Renove antes do vencimento</strong>
            <span>
              Utilize o tempo de expiração retornado na autenticação para
              solicitar um novo token antes que o atual expire.
            </span>
          </li>
        </ol>
      </section>

      <section v-if="convencoes.length" class="pg-bloco doc-secao">
        <div class="pg-bloco-topo">
          <h2>Convenções</h2>
        </div>
        <p class="doc-texto-apoio">
          Padrões aplicados às {{ totalRotas }} rotas da API.
        </p>

        <div class="doc-convencoes">
          <article
            v-for="item in convencoes"
            :key="item.titulo"
            class="doc-convencao-card"
          >
            <h3>{{ item.titulo }}</h3>
            <p>
              <template v-for="(parte, idx) in item.partes" :key="idx">
                <span v-if="parte.mono" class="pg-mono doc-inline-mono">{{ parte.mono }}</span>
                <strong v-else-if="parte.bold">{{ parte.bold }}</strong>
                <template v-else>{{ parte.texto }}</template>
              </template>
            </p>
          </article>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped src="../assets/css/documentacao-api.css"></style>
