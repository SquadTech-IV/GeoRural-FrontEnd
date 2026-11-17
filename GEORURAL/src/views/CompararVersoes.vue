<script setup>
import { computed, onMounted, ref } from 'vue'
import BarraNavegacao from '../components/BarraNavegacao.vue'

defineOptions({
  name: 'CompararVersoes',
})

const INDICADORES = {
  IAE: {
    nome: 'Índice de Área Embargada',
    unidade: '%',
    boa: 'SEM_EMBARGO',
    ruim: 'EMBARGADO',
  },
  IAPP: {
    nome: 'Índice de APP Conservada',
    unidade: '%',
    boa: 'CONSERVADA',
    ruim: 'DEGRADADA',
  },
  IRL: {
    nome: 'Índice de Reserva Legal',
    unidade: '%',
    boa: 'CONFORME',
    ruim: 'DEFICIT',
  },
  ICV: {
    nome: 'Índice de Cobertura Vegetal',
    unidade: '%',
    boa: 'CONSERVADO',
    ruim: 'DEGRADADO',
  },
  IDESMAT: {
    nome: 'Índice de Desmatamento',
    unidade: '%',
    boa: 'SEM_SUPRESSAO',
    ruim: 'COM_SUPRESSAO',
  },
  ISAP: {
    nome: 'Índice de Sobreposição',
    unidade: '%',
    boa: 'SEM_SOBREPOSICAO',
    ruim: 'SOBREPOSTO',
  },
  IFC: {
    nome: 'Índice de Focos de Calor',
    unidade: 'focos',
    boa: 'SEM_FOCO',
    ruim: 'COM_FOCOS',
  },
}

const ROTULOS_SITUACAO = {
  EMBARGADO: 'Embargado',
  SEM_EMBARGO: 'Sem embargo',
  DEGRADADA: 'Degradada',
  CONSERVADA: 'Conservada',
  CONFORME: 'Conforme',
  DEFICIT: 'Déficit',
  CONSERVADO: 'Conservado',
  DEGRADADO: 'Degradado',
  SEM_SUPRESSAO: 'Sem supressão',
  COM_SUPRESSAO: 'Com supressão',
  SEM_SOBREPOSICAO: 'Sem sobreposição',
  SOBREPOSTO: 'Sobreposto',
  SEM_FOCO: 'Sem foco',
  COM_FOCOS: 'Com focos',
}

const sigla = ref('IRL')
const versaoAId = ref(null)
const versaoBId = ref(null)
const buscaCar = ref('')
const abertas = ref(new Set())
const carregando = ref(false)

const versoes = ref([])
const imoveisAlterados = ref([])

const indicadorAtual = computed(
  () =>
    INDICADORES[sigla.value] ?? {
      nome: sigla.value,
      unidade: '%',
      boa: 'CONFORME',
      ruim: 'DEFICIT',
    }
)

const versaoA = computed(
  () => versoes.value.find((v) => v.id === versaoAId.value) ?? null
)

const versaoB = computed(
  () => versoes.value.find((v) => v.id === versaoBId.value) ?? null
)

const camadas = computed(() => {
  const A = versaoA.value
  const B = versaoB.value
  if (!A || !B) return []

  const origem = [
    ['Arquivo', A.origem?.nome ?? null, B.origem?.nome ?? null],
    ['arq_bruto_id', A.origem?.arqId ?? null, B.origem?.arqId ?? null],
    ['Hash do arquivo', A.origem?.hash ?? null, B.origem?.hash ?? null],
    [
      'Registros lidos',
      A.origem?.registros !== undefined && A.origem?.registros !== null
        ? Number(A.origem.registros).toLocaleString('pt-BR')
        : null,
      B.origem?.registros !== undefined && B.origem?.registros !== null
        ? Number(B.origem.registros).toLocaleString('pt-BR')
        : null,
    ],
    ['Competência', A.competencia ?? null, B.competencia ?? null],
  ]

  const regra = [
    ['Versão da regra', A.regra?.versao ?? null, B.regra?.versao ?? null],
    ['Fórmula', A.regra?.formula ?? null, B.regra?.formula ?? null],
    ['Autor', A.regra?.autor ?? null, B.regra?.autor ?? null],
    ['Motivo', A.regra?.motivo ?? null, B.regra?.motivo ?? null],
  ]

  const paramsA = A.params ?? {}
  const paramsB = B.params ?? {}
  const nomes = [...new Set([...Object.keys(paramsA), ...Object.keys(paramsB)])].sort()
  const params = nomes.map((n) => [n, paramsA[n] ?? null, paramsB[n] ?? null])

  const mudou = (linhas) => linhas.some(([, a, b]) => String(a ?? '') !== String(b ?? ''))

  return [
    {
      chave: 'ORIGEM',
      titulo: 'Dado de origem',
      sub: 'o arquivo bruto que alimentou a versão',
      linhas: origem,
      mudou: mudou(origem),
    },
    {
      chave: 'REGRA',
      titulo: 'Regra de cálculo',
      sub: 'a fórmula aplicada, em REGRA_CALCULO',
      linhas: regra,
      mudou: mudou(regra),
    },
    {
      chave: 'PARAMETRO',
      titulo: 'Parâmetros da regra',
      sub: 'os valores em PARAMETRO_REGRA_CALCULO',
      linhas: params,
      mudou: mudou(params),
    },
  ]
})

const veredito = computed(() => {
  const A = versaoA.value
  const B = versaoB.value
  if (!A || !B) return null

  const mudaram = camadas.value.filter((c) => c.mudou)
  const mesmoResultado =
    A.res?.media === B.res?.media && A.res?.conformes === B.res?.conformes

  const competenciaDiferente =
    A.competencia && B.competencia && A.competencia !== B.competencia

  const inalteradas = camadas.value
    .filter((c) => !c.mudou)
    .map((c) => c.titulo.toLowerCase())

  if (A.id === B.id) {
    return {
      tipo: 'igual',
      icone: '=',
      titulo: 'Mesma versão dos dois lados',
      modo: 'MESMA_VERSAO',
      competenciaDiferente: false,
      inalteradas: [],
    }
  }

  if (mudaram.length === 0 && !mesmoResultado) {
    return {
      tipo: 'alerta',
      icone: '!',
      titulo: 'Resultados diferentes sem nenhuma causa registrada',
      modo: 'SEM_CAUSA',
      competenciaDiferente,
      inalteradas: [],
    }
  }

  if (mudaram.length === 0) {
    return {
      tipo: 'igual',
      icone: '=',
      titulo: 'Nada mudou entre as duas',
      modo: 'EQUIVALENTE',
      competenciaDiferente,
      inalteradas: [],
    }
  }

  if (mudaram.length === 1) {
    const c = mudaram[0]
    const parametrosAlterados =
      c.chave === 'PARAMETRO'
        ? c.linhas
            .filter(([, a, b]) => String(a ?? '') !== String(b ?? ''))
            .map(([nome, a, b]) => ({ nome, de: a, para: b }))
        : []

    return {
      tipo: 'atribuivel',
      icone: '✓',
      titulo: `A diferença veio ${
        c.chave === 'ORIGEM'
          ? 'do dado de origem'
          : c.chave === 'REGRA'
            ? 'da regra'
            : 'de um parâmetro'
      }`,
      modo: 'ATRIBUIVEL',
      camada: c.chave,
      parametrosAlterados,
      competenciaDiferente,
      inalteradas,
    }
  }

  return {
    tipo: 'ambiguo',
    icone: '?',
    titulo: 'A causa não pode ser atribuída',
    modo: 'AMBIGUO',
    qtdMudaram: mudaram.length,
    nomesMudaram: mudaram.map((c) => c.titulo.toLowerCase()),
    competenciaDiferente,
    inalteradas,
  }
})

const imoveisFiltrados = computed(() => {
  const termo = buscaCar.value.trim().toUpperCase()
  if (!termo) return imoveisAlterados.value
  return imoveisAlterados.value.filter((l) =>
    String(l.car ?? '').toUpperCase().includes(termo)
  )
})

const qtdTrocaramSituacao = computed(
  () => imoveisAlterados.value.filter((l) => l.virou).length
)

function sincronizarAbertas() {
  abertas.value = new Set(
    camadas.value.filter((c) => c.mudou).map((c) => c.chave)
  )
}

function alternarCamada(chave) {
  const copia = new Set(abertas.value)
  if (copia.has(chave)) {
    copia.delete(chave)
  } else {
    copia.add(chave)
  }
  abertas.value = copia
}

function fmtInteiro(v) {
  if (v === null || v === undefined) return '—'
  return Number(v).toLocaleString('pt-BR')
}

function fmtDecimal(v, casas = 2) {
  if (v === null || v === undefined) return '—'
  return Number(v).toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })
}

function textoDelta(depois, antes, casas = 2, inverso = false) {
  if (
    depois === null ||
    depois === undefined ||
    antes === null ||
    antes === undefined
  ) {
    return { texto: '—', cls: 'cmp-id--neutro' }
  }
  const dif = Number(depois) - Number(antes)
  if (Math.abs(dif) < 0.005) {
    return { texto: 'sem mudança', cls: 'cmp-id--neutro' }
  }
  const positivo = inverso ? dif < 0 : dif > 0
  const sinal = dif > 0 ? '+' : ''
  return {
    texto: `${sinal}${dif.toFixed(casas)}`,
    cls: positivo ? 'cmp-id--sobe' : 'cmp-id--desce',
  }
}

function formatarSituacao(sit) {
  if (!sit) return '—'
  const chave = String(sit).trim().toUpperCase()
  return ROTULOS_SITUACAO[chave] ?? String(sit).replace(/_/g, ' ')
}

function ehSituacaoBoa(sit) {
  if (!sit) return false
  const chave = String(sit).trim().toUpperCase()
  return chave === indicadorAtual.value.boa
}

async function carregarVersoes() {
  carregando.value = true
  try {
    if (versoes.value.length) {
      versaoAId.value = versoes.value[0].id
      versaoBId.value = versoes.value[versoes.value.length - 1].id
    } else {
      versaoAId.value = null
      versaoBId.value = null
    }
    await compararSelecionadas()
  } finally {
    carregando.value = false
  }
}

async function compararSelecionadas() {
  sincronizarAbertas()
}

onMounted(async () => {
  await carregarVersoes()
})
</script>

<template>
  <div class="pg-layout">
    <BarraNavegacao />

    <main class="pg-pagina">
      <header class="pg-cabecalho">
        <h1>O que mudou entre duas versões</h1>
        <p>
          Duas versões publicadas do mesmo indicador, lado a lado — e, mais
          importante, <strong>o que causou</strong> a diferença: o dado de
          origem, a regra de cálculo ou um parâmetro dela.
        </p>
      </header>

      <section class="pg-filtros" aria-label="Seleção de versões para comparação">
        <label class="pg-campo">
          <span>Indicador</span>
          <select v-model="sigla" @change="carregarVersoes">
            <option v-for="(info, sig) in INDICADORES" :key="sig" :value="sig">
              {{ sig }} — {{ info.nome }}
            </option>
          </select>
        </label>

        <label class="pg-campo">
          <span>Versão base</span>
          <select v-model="versaoAId" @change="compararSelecionadas">
            <option v-for="v in versoes" :key="v.id" :value="v.id">
              v{{ v.n }} · {{ v.competencia }} · {{ v.situacao }}
            </option>
          </select>
        </label>

        <span class="cmp-separador">comparada com</span>

        <label class="pg-campo">
          <span>Versão comparada</span>
          <select v-model="versaoBId" @change="compararSelecionadas">
            <option v-for="v in versoes" :key="v.id" :value="v.id">
              v{{ v.n }} · {{ v.competencia }} · {{ v.situacao }}
            </option>
          </select>
        </label>
      </section>

      <section
        v-if="veredito"
        class="cmp-veredito"
        :class="`cmp-veredito--${veredito.tipo}`"
        aria-label="Diagnóstico da comparação"
      >
        <div class="cmp-vi">{{ veredito.icone }}</div>
        <div class="cmp-vcorpo">
          <h2 class="cmp-vt">{{ veredito.titulo }}</h2>

          <p v-if="veredito.modo === 'MESMA_VERSAO'" class="cmp-vd">
            Escolha duas versões diferentes para comparar.
          </p>

          <p v-else-if="veredito.modo === 'SEM_CAUSA'" class="cmp-vd">
            Mesmo arquivo, mesma regra, mesmos parâmetros — e ainda assim a média
            foi de <strong>{{ fmtDecimal(versaoA?.res?.media) }}%</strong> para
            <strong>{{ fmtDecimal(versaoB?.res?.media) }}%</strong>. O cálculo
            deveria ser determinístico; verifique a linhagem das duas versões
            antes de aceitar qualquer uma delas.
          </p>

          <p v-else-if="veredito.modo === 'EQUIVALENTE'" class="cmp-vd">
            Mesmo arquivo, mesma regra, mesmos parâmetros e o mesmo resultado. As
            duas versões são equivalentes.
          </p>

          <p v-else-if="veredito.modo === 'ATRIBUIVEL'" class="cmp-vd">
            Só uma das três camadas mudou:
            <template v-if="veredito.camada === 'PARAMETRO'">
              <template
                v-for="(p, i) in veredito.parametrosAlterados"
                :key="p.nome"
              >
                <span v-if="i > 0">, </span>
                <span class="pg-mono">{{ p.nome }}</span> de
                <strong>{{ p.de ?? 'nulo' }}</strong> para
                <strong>{{ p.para ?? 'nulo' }}</strong>
              </template>
            </template>
            <template v-else-if="veredito.camada === 'REGRA'">
              a regra passou de <strong>{{ versaoA?.regra?.versao }}</strong> para
              <strong>{{ versaoB?.regra?.versao }}</strong>
            </template>
            <template v-else>
              o arquivo passou de <strong>{{ versaoA?.origem?.nome }}</strong>
              para <strong>{{ versaoB?.origem?.nome }}</strong>
            </template>.
            Então <strong>toda</strong> a diferença de resultado é atribuível a
            ela.
          </p>

          <p v-else class="cmp-vd">
            Mudaram <strong>{{ veredito.qtdMudaram }}</strong> camadas ao mesmo
            tempo: <strong>{{ veredito.nomesMudaram.join(' e ') }}</strong>. Não é
            possível isolar quanto da diferença veio de cada uma sem uma versão
            intermediária que altere apenas um fator de cada vez.
          </p>

          <p
            v-if="veredito.inalteradas && veredito.inalteradas.length"
            class="cmp-vd cmp-vd--inalt"
          >
            <strong>Descartado:</strong>
            {{ veredito.inalteradas.join(' e ') }}
            {{ veredito.inalteradas.length > 1 ? 'continuam' : 'continua' }}
            idêntico{{ veredito.inalteradas.length > 1 ? 's' : '' }} entre as duas
            versões.
          </p>

          <p
            v-if="veredito.competenciaDiferente"
            class="cmp-vd cmp-vd--ressalva"
          >
            As duas versões são de <strong>competências diferentes</strong>
            (<span class="pg-mono">{{ versaoA?.competencia }}</span> e
            <span class="pg-mono">{{ versaoB?.competencia }}</span>). Parte da
            diferença reflete alterações ocorridas no território no período e não
            apenas o reprocessamento.
          </p>
        </div>
      </section>

      <section v-if="camadas.length" class="cmp-camadas" aria-label="Camadas comparadas">
        <article
          v-for="c in camadas"
          :key="c.chave"
          class="cmp-cam"
          :class="{
            'cmp-cam--mudou': c.mudou,
            'cmp-cam--aberta': abertas.has(c.chave),
          }"
        >
          <div class="cmp-cam-topo" @click="alternarCamada(c.chave)">
            <span
              class="cmp-chip"
              :class="c.mudou ? 'cmp-chip--mudou' : 'cmp-chip--igual'"
            >
              <i class="cmp-dot" />
              {{ c.mudou ? 'mudou' : 'igual' }}
            </span>

            <div class="cmp-cam-nome">
              <strong>{{ c.titulo }}</strong>
              <span>{{ c.sub }}</span>
            </div>

            <span class="cmp-caret">▶</span>
          </div>

          <div v-if="abertas.has(c.chave)" class="cmp-diff">
            <div class="cmp-dh" />
            <div class="cmp-dh">
              <span class="cmp-vchip cmp-vchip--a">
                v{{ versaoA?.n }} · {{ versaoA?.competencia }}
              </span>
            </div>
            <div class="cmp-dh">
              <span class="cmp-vchip cmp-vchip--b">
                v{{ versaoB?.n }} · {{ versaoB?.competencia }}
              </span>
            </div>

            <template v-for="[k, a, b] in c.linhas" :key="k">
              <div class="cmp-dk">{{ k }}</div>

              <div
                class="cmp-dv cmp-dv--a"
                :class="{ 'cmp-dv--dif': String(a ?? '') !== String(b ?? '') }"
              >
                <span v-if="a === null || a === undefined" class="cmp-nd">
                  não existia
                </span>
                <template v-else>{{ a }}</template>
              </div>

              <div
                class="cmp-dv cmp-dv--b"
                :class="{ 'cmp-dv--dif': String(a ?? '') !== String(b ?? '') }"
              >
                <span v-if="b === null || b === undefined" class="cmp-nd">
                  não existia
                </span>
                <template v-else>{{ b }}</template>
              </div>
            </template>
          </div>
        </article>
      </section>

      <section
        v-if="versaoA && versaoB"
        class="cmp-impacto"
        aria-label="Impacto agregado entre versões"
      >
        <div>
          <span class="cmp-ik">Imóveis</span>
          <strong class="cmp-iv">{{ fmtInteiro(versaoB.res?.imoveis) }}</strong>
          <span
            class="cmp-id"
            :class="textoDelta(versaoB.res?.imoveis, versaoA.res?.imoveis, 0).cls"
          >
            {{ textoDelta(versaoB.res?.imoveis, versaoA.res?.imoveis, 0).texto }}
          </span>
        </div>

        <div>
          <span class="cmp-ik">Média do indicador</span>
          <strong class="cmp-iv">{{ fmtDecimal(versaoB.res?.media) }}%</strong>
          <span
            class="cmp-id"
            :class="textoDelta(versaoB.res?.media, versaoA.res?.media, 2).cls"
          >
            {{ textoDelta(versaoB.res?.media, versaoA.res?.media, 2).texto }}
          </span>
        </div>

        <div>
          <span class="cmp-ik">Conformes</span>
          <strong class="cmp-iv">{{ fmtInteiro(versaoB.res?.conformes) }}</strong>
          <span
            class="cmp-id"
            :class="textoDelta(versaoB.res?.conformes, versaoA.res?.conformes, 0).cls"
          >
            {{ textoDelta(versaoB.res?.conformes, versaoA.res?.conformes, 0).texto }}
          </span>
        </div>

        <div>
          <span class="cmp-ik">Hash da versão</span>
          <strong class="pg-mono cmp-iv cmp-iv--mono">
            {{ versaoB.hash ?? '—' }}
          </strong>
          <span class="cmp-id cmp-id--neutro">
            era {{ versaoA.hash ?? '—' }}
          </span>
        </div>

        <div>
          <span class="cmp-ik">Publicada por</span>
          <strong class="cmp-iv cmp-iv--texto">
            {{ versaoB.autor ?? '—' }}
          </strong>
          <span class="cmp-id cmp-id--neutro">
            {{ versaoB.publicada ?? '—' }}
          </span>
        </div>
      </section>

      <section class="pg-bloco" style="margin-top: 18px">
        <div class="pg-bloco-topo">
          <div>
            <h2>Imóveis que mudaram de situação</h2>
            <p class="cmp-bloco-sub">
              <template v-if="imoveisAlterados.length">
                <strong>{{ fmtInteiro(qtdTrocaramSituacao) }}</strong> trocaram de
                situação · amostra de {{ fmtInteiro(imoveisAlterados.length) }}
                imóveis com diferença
              </template>
              <template v-else>
                nenhum imóvel mudou entre estas duas versões
              </template>
            </p>
          </div>

          <label class="pg-campo cmp-busca-car">
            <span>Buscar CAR</span>
            <input
              v-model="buscaCar"
              type="search"
              placeholder="Buscar CAR…"
            />
          </label>
        </div>

        <div class="pg-rolagem">
          <table class="pg-tabela">
            <thead>
              <tr>
                <th>CAR</th>
                <th>Município</th>
                <th class="num">Valor antes</th>
                <th class="num">Valor depois</th>
                <th class="num">Diferença</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="carregando">
                <td colspan="6" class="pg-vazio">Comparando versões...</td>
              </tr>

              <template v-else-if="imoveisFiltrados.length">
                <tr v-for="l in imoveisFiltrados" :key="l.car">
                  <td class="pg-mono">{{ l.car }}</td>
                  <td>{{ l.municipio }}</td>
                  <td class="num">{{ fmtDecimal(l.antes) }}%</td>
                  <td class="num">
                    <strong>{{ fmtDecimal(l.depois) }}%</strong>
                  </td>
                  <td
                    class="num"
                    :class="
                      (l.depois ?? 0) - (l.antes ?? 0) > 0
                        ? 'cmp-texto-ok'
                        : 'cmp-texto-erro'
                    "
                  >
                    <strong>
                      {{ (l.depois ?? 0) - (l.antes ?? 0) > 0 ? '+' : '' }}{{ fmtDecimal((l.depois ?? 0) - (l.antes ?? 0)) }}
                    </strong>
                  </td>
                  <td>
                    <template v-if="l.virou">
                      <span
                        class="cmp-chip cmp-chip--apagado"
                        :class="
                          ehSituacaoBoa(l.sa)
                            ? 'cmp-chip--ok'
                            : 'cmp-chip--danger'
                        "
                      >
                        {{ formatarSituacao(l.sa) }}
                      </span>
                      <span class="cmp-seta">→</span>
                      <span
                        class="cmp-chip"
                        :class="
                          ehSituacaoBoa(l.sb)
                            ? 'cmp-chip--ok'
                            : 'cmp-chip--danger'
                        "
                      >
                        <i class="cmp-dot" />
                        {{ formatarSituacao(l.sb) }}
                      </span>
                    </template>
                    <span v-else class="cmp-chip cmp-chip--igual">manteve</span>
                  </td>
                </tr>
              </template>

              <tr v-else>
                <td colspan="6" class="pg-vazio">
                  {{
                    buscaCar.trim()
                      ? `Nenhum CAR encontrado com "${buscaCar}".`
                      : 'Nenhum imóvel mudou de valor entre as versões selecionadas.'
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p v-if="imoveisFiltrados.length" class="pg-ajuda">
          <strong>{{ fmtInteiro(imoveisFiltrados.length) }}</strong> imóvel(is)
          na amostra exibida.
        </p>
      </section>
    </main>
  </div>
</template>

<style scoped src="../assets/css/comparar-versoes.css"></style>
