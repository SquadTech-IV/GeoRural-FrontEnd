<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import BarraNavegacao from '../components/BarraNavegacao.vue'
import ToastMensagem from '../components/ToastMensagem.vue'

import {
  auditoriaService,
  requisicaoAuditoriaCancelada,
} from '../services/auditoriaService'

defineOptions({ name: 'AuditoriaDadosPagina' })

const router = useRouter()

const busca = ref('')
const filtro = ref('TODOS')
const lista = ref([])
const selecionado = ref(null)
const trilha = ref(null)

const carregando = ref(false)
const consultado = ref(false)
const carregandoTrilha = ref(false)
const falhouTrilha = ref(false)
const mensagem = ref('')

const modalTipo = ref(null)
const botaoVer = ref(null)

let consultaLista = null
let consultaTrilha = null
let destruido = false
let debounce = null

const ELOS = {
  regra: {
    titulo: 'Regra de cálculo aplicada',
    us: 'US14',
    rotulo: 'Regras e Métodos',
    rota: '/',
    glyph: 'ƒ',
  },
  execucao: {
    titulo: 'Execução do pipeline',
    us: 'US33',
    rotulo: 'Trajetória no datalake',
    rota: '/rastreabilidade',
    glyph: '#',
  },
  transformacoes: {
    titulo: 'Transformações aplicadas',
    us: 'US09',
    rotulo: 'Zona tratada',
    rota: '/zona-tratada',
    glyph: '⇄',
  },
  origem: {
    titulo: 'Arquivos de origem',
    us: 'US07',
    rotulo: 'Arquivos recebidos',
    rota: '/arquivos-recebidos',
    glyph: '↧',
  },
}
const ORDEM_ELOS = ['regra', 'execucao', 'transformacoes', 'origem']

function fmtNum(valor, sufixo = '') {
  return typeof valor === 'number' && Number.isFinite(valor)
    ? `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}${sufixo}`
    : null
}
function fmtPerc(valor) {
  return fmtNum(valor, '%') ?? '—'
}
function fmtHa(valor) {
  return fmtNum(valor, ' ha')
}
function fmtData(valor) {
  if (!valor) return '—'
  const data = new Date(valor)
  return Number.isNaN(data.getTime())
    ? String(valor)
    : data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}
function fmtTamanho(bytes) {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes)) return null
  if (bytes >= 1048576) {
    return `${(bytes / 1048576).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} KB`
  }
  return `${bytes} B`
}
function fmtDuracao(seg) {
  if (typeof seg !== 'number' || !Number.isFinite(seg) || seg < 0) return null
  const minutos = Math.floor(seg / 60)
  const segundos = Math.round(seg % 60)
  return minutos ? `${minutos} min ${segundos} s` : `${segundos} s`
}
function versaoLabel(numero) {
  return numero == null ? '—' : `v${numero}`
}
function nomeImovel(registro) {
  return registro?.municipio || registro?.codigoCar || 'Imóvel rural'
}

// Frase de apoio sob o valor principal, sem inventar número que o backend não deu.
function valorSub(res) {
  if (!res) return ''
  const ha = fmtHa(res.valorHectares)
  const area = fmtHa(res.areaTotalHa)
  const sigla = String(res.indicadorSigla || '').toUpperCase()
  if (sigla === 'IAE') {
    if (res.valorHectares === 0 || res.valorPercentual === 0) {
      return 'sem sobreposição com embargos federais'
    }
    return `${ha ?? '—'} em sobreposição com embargos${area ? ` · imóvel de ${area}` : ''}`
  }
  if (sigla === 'IRL') {
    if (!ha) return 'reserva legal do imóvel'
    return `${ha} de reserva legal${area ? ` · imóvel de ${area}` : ''}`
  }
  return [ha, area ? `imóvel de ${area}` : null].filter(Boolean).join(' · ')
}

function origemTipo(forma) {
  return String(forma || '').toUpperCase() === 'API' ? 'API' : 'UPLOAD'
}
function origemQuem(origem) {
  if (origemTipo(origem.formaEntrada) === 'API') {
    return origem.fonte ? `ingestão automática (${origem.fonte})` : 'ingestão automática'
  }
  return origem.enviadoPor || 'operador'
}
function origemMeta(origem) {
  return [
    origem.formato,
    fmtTamanho(origem.tamanhoBytes),
    `enviado por ${origemQuem(origem)}`,
    fmtData(origem.dataUpload),
  ]
    .filter(Boolean)
    .join(' · ')
}

function gist(tipo) {
  const t = trilha.value
  if (!t) return ''
  if (tipo === 'regra') {
    return t.regra ? `Regra ${t.regra.versao ?? ''}`.trim() : 'Sem regra registrada'
  }
  if (tipo === 'execucao') {
    return t.execucao
      ? `Execução #${t.execucao.id} · ${fmtData(t.execucao.inicio)}`
      : 'Execução não registrada'
  }
  if (tipo === 'transformacoes') {
    return `${(t.transformacoes || []).length} transformação(ões) aplicada(s)`
  }
  if (tipo === 'origem') {
    return `${(t.origem || []).length} arquivo(s) de origem`
  }
  return ''
}

// ---------- dados ----------
function chave(item) {
  return item?.id
}

async function carregarLista() {
  if (destruido) return
  consultaLista?.abort()
  const atual = new AbortController()
  consultaLista = atual

  carregando.value = true
  mensagem.value = ''

  try {
    const dados = await auditoriaService.listarResultados(
      {
        indicador: filtro.value || 'TODOS',
        busca: busca.value.trim() || undefined,
      },
      { signal: atual.signal },
    )
    if (destruido || atual.signal.aborted || consultaLista !== atual) return

    const arr = Array.isArray(dados) ? dados : (dados?.content ?? [])
    lista.value = arr
    consultado.value = true

    const aindaExiste =
      selecionado.value && arr.some((i) => chave(i) === chave(selecionado.value))
    if (aindaExiste) {
      selecionar(arr.find((i) => chave(i) === chave(selecionado.value)))
    } else if (arr.length) {
      selecionar(arr[0])
    } else {
      selecionado.value = null
      trilha.value = null
    }
  } catch (erro) {
    if (destruido || atual.signal.aborted || requisicaoAuditoriaCancelada(erro)) return
    consultado.value = true
    mensagem.value = erro.message
  } finally {
    if (!destruido && consultaLista === atual) {
      carregando.value = false
      consultaLista = null
    }
  }
}

async function carregarTrilha() {
  consultaTrilha?.abort()
  trilha.value = null
  falhouTrilha.value = false
  if (!selecionado.value) return

  const atual = new AbortController()
  consultaTrilha = atual
  carregandoTrilha.value = true

  try {
    const dados = await auditoriaService.consultarLinhagem(selecionado.value.id, {
      signal: atual.signal,
    })
    if (destruido || atual.signal.aborted || consultaTrilha !== atual) return
    trilha.value = dados
  } catch (erro) {
    if (destruido || atual.signal.aborted || requisicaoAuditoriaCancelada(erro)) return
    falhouTrilha.value = true
    mensagem.value = erro.message
  } finally {
    if (consultaTrilha === atual) {
      carregandoTrilha.value = false
      consultaTrilha = null
    }
  }
}

function selecionar(item) {
  selecionado.value = item
  carregarTrilha()
}

function aoBuscar(valor) {
  busca.value = valor
  clearTimeout(debounce)
  debounce = setTimeout(carregarLista, 300)
}

function setFiltro(valor) {
  filtro.value = valor
  carregarLista()
}

function abrirModal(tipo) {
  if (!trilha.value) return
  modalTipo.value = tipo
  nextTick(() => botaoVer.value?.focus())
}
function fecharModal() {
  modalTipo.value = null
}
function irParaTela(tipo) {
  const elo = ELOS[tipo]
  fecharModal()
  if (elo?.rota) router.push(elo.rota)
}

function fecharMensagem() {
  mensagem.value = ''
}

function aoTeclar(evento) {
  if (evento.key === 'Escape') fecharModal()
}

onMounted(() => {
  carregarLista()
  window.addEventListener('keydown', aoTeclar)
})
onBeforeUnmount(() => {
  destruido = true
  clearTimeout(debounce)
  consultaLista?.abort()
  consultaTrilha?.abort()
  window.removeEventListener('keydown', aoTeclar)
})
</script>

<template>
  <div class="aud-layout">
    <BarraNavegacao />

    <main class="aud-pagina">
      <header class="aud-cabecalho">
        <h1>Linhagem e auditoria</h1>
        <p>
          Parta de um resultado publicado e percorra a trilha até os arquivos de origem —
          para comprovar como aquele número foi produzido.
        </p>
      </header>

      <section class="aud-card aud-filtros" :aria-busy="carregando">
        <div class="aud-campo aud-campo--busca">
          <label for="aud-busca">Buscar resultado</label>
          <input
            id="aud-busca"
            type="search"
            :value="busca"
            placeholder="Buscar por CAR ou município..."
            @input="aoBuscar($event.target.value)"
          />
        </div>

        <div class="aud-campo">
          <label for="aud-indicador">Indicador</label>
          <select id="aud-indicador" :value="filtro" @change="setFiltro($event.target.value)">
            <option value="TODOS">Todos os indicadores</option>
            <option value="IAE">IAE — Área embargada</option>
            <option value="IRL">IRL — Reserva legal</option>
          </select>
        </div>

        <button type="button" class="aud-botao" :disabled="carregando" @click="carregarLista">
          {{ carregando ? 'Consultando...' : 'Atualizar' }}
        </button>
      </section>

      <div class="aud-split">
        <div class="aud-listcard">
          <div class="aud-lhead">Resultados publicados</div>

          <p v-if="carregando" class="aud-estado" role="status">Consultando resultados...</p>

          <template v-else-if="consultado">
            <p v-if="!lista.length" class="aud-estado">
              Nenhum resultado publicado encontrado.<br />Ajuste a busca ou o filtro.
            </p>

            <button
              v-for="item in lista"
              v-else
              :key="chave(item)"
              type="button"
              class="aud-item"
              :class="{ 'aud-item--ativo': selecionado && chave(selecionado) === chave(item) }"
              @click="selecionar(item)"
            >
              <span class="aud-item-grow">
                <span class="aud-item-nome">{{ nomeImovel(item) }}</span>
                <span class="aud-item-meta">
                  {{ item.indicadorSigla }} {{ fmtPerc(item.valorPercentual) }} ·
                  CAR {{ item.codigoCar || '—' }}
                </span>
              </span>
              <span class="aud-chip aud-chip--pub">{{ versaoLabel(item.versaoNumero) }}</span>
            </button>
          </template>
        </div>

        <div class="aud-detail">
          <p v-if="!selecionado" class="aud-detail-vazio">
            Selecione um resultado publicado para ver a trilha de auditoria.
          </p>

          <template v-else>
            <div class="aud-dhead">
              <div class="aud-rtop">
                <div>
                  <h2>{{ nomeImovel(selecionado) }}</h2>
                  <div class="aud-dsub">
                    CAR {{ selecionado.codigoCar || '—' }} · {{ selecionado.indicadorSigla }}
                    <template v-if="trilha?.resultado?.indicadorNome">
                      · {{ trilha.resultado.indicadorNome }}
                    </template>
                  </div>
                </div>
                <span class="aud-chip aud-chip--pub">{{ versaoLabel(selecionado.versaoNumero) }}</span>
              </div>

              <div class="aud-valbox">
                <div class="aud-valn">
                  {{ selecionado.indicadorSigla }} {{ fmtPerc(selecionado.valorPercentual) }}
                </div>
                <div class="aud-vals">{{ valorSub(trilha?.resultado || selecionado) }}</div>
                <div class="aud-valpub">
                  Publicado em {{ fmtData(selecionado.publicadoEm) }}
                  <template v-if="trilha?.resultado?.publicadoPor">
                    por {{ trilha.resultado.publicadoPor }}
                  </template>
                </div>
              </div>
            </div>

            <p class="aud-sectitle">Trilha de auditoria — do número até a origem</p>

            <p v-if="carregandoTrilha" class="aud-estado-inline" role="status">
              Consultando a trilha completa...
            </p>

            <button
              v-else-if="falhouTrilha"
              type="button"
              class="aud-botao"
              @click="carregarTrilha"
            >
              Tentar consultar a trilha novamente
            </button>

            <div v-else-if="trilha" class="aud-chain">
              <div v-for="tipo in ORDEM_ELOS" :key="tipo" class="aud-node">
                <div class="aud-dot">{{ ELOS[tipo].glyph }}</div>
                <button type="button" class="aud-ncard" @click="abrirModal(tipo)">
                  <div class="aud-ntitle">
                    {{ ELOS[tipo].titulo }}
                    <span class="aud-chevv">ver →</span>
                  </div>
                  <div class="aud-ngist">{{ gist(tipo) }}</div>
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>
    </main>

    <div v-if="modalTipo && trilha" class="aud-modal-backdrop" @click.self="fecharModal">
      <div class="aud-modal" role="dialog" aria-modal="true">
        <div class="aud-modal-h">
          <div>
            <div class="aud-mtitle">{{ ELOS[modalTipo].titulo }}</div>
            <div class="aud-msub">
              {{ nomeImovel(trilha.resultado) }} · {{ trilha.resultado?.indicadorSigla }} ·
              versão {{ versaoLabel(trilha.resultado?.versaoNumero) }}
            </div>
          </div>
          <button type="button" class="aud-x" aria-label="Fechar" @click="fecharModal">×</button>
        </div>

        <div class="aud-modal-body">
          <!-- REGRA -->
          <template v-if="modalTipo === 'regra'">
            <p v-if="trilha.regra?.descricao" class="aud-mdesc">{{ trilha.regra.descricao }}</p>
            <div v-if="trilha.regra" class="aud-kv">
              <div class="aud-row">
                <span class="aud-k">Regra</span>
                <span class="aud-v">versão {{ trilha.regra.versao ?? '—' }}</span>
              </div>
              <div v-for="(p, i) in (trilha.regra.parametros || [])" :key="i" class="aud-row">
                <span class="aud-k">{{ p.nome }}</span>
                <span class="aud-v">{{ p.valor }}{{ p.unidade ? ` ${p.unidade}` : '' }}</span>
              </div>
              <div class="aud-row">
                <span class="aud-k">Vigência</span>
                <span class="aud-v">{{ trilha.regra.vigente ? 'Vigente' : 'Substituída' }}</span>
              </div>
              <div v-if="trilha.regra.autor" class="aud-row">
                <span class="aud-k">Autor</span>
                <span class="aud-v">{{ trilha.regra.autor }}</span>
              </div>
              <div v-if="trilha.regra.criadaEm" class="aud-row">
                <span class="aud-k">Criada em</span>
                <span class="aud-v">{{ fmtData(trilha.regra.criadaEm) }}</span>
              </div>
            </div>
            <p v-else class="aud-estado-inline">Nenhuma regra registrada para este resultado.</p>
          </template>

          <template v-else-if="modalTipo === 'execucao'">
            <div v-if="trilha.execucao" class="aud-kv">
              <div class="aud-row">
                <span class="aud-k">Execução</span>
                <span class="aud-v">#{{ trilha.execucao.id }}</span>
              </div>
              <div class="aud-row">
                <span class="aud-k">Quando</span>
                <span class="aud-v">{{ fmtData(trilha.execucao.inicio) }}</span>
              </div>
              <div v-if="fmtDuracao(trilha.execucao.duracaoSeg)" class="aud-row">
                <span class="aud-k">Duração</span>
                <span class="aud-v">{{ fmtDuracao(trilha.execucao.duracaoSeg) }}</span>
              </div>
              <div class="aud-row">
                <span class="aud-k">Status</span>
                <span class="aud-v">{{ trilha.execucao.status || '—' }}</span>
              </div>
              <div v-if="trilha.execucao.disparadoPor" class="aud-row">
                <span class="aud-k">Disparada por</span>
                <span class="aud-v">{{ trilha.execucao.disparadoPor }}</span>
              </div>
              <div v-if="trilha.execucao.registrosProcessados != null" class="aud-row">
                <span class="aud-k">Registros processados</span>
                <span class="aud-v">{{ trilha.execucao.registrosProcessados }}</span>
              </div>
              <div v-if="trilha.execucao.registrosRejeitados != null" class="aud-row">
                <span class="aud-k">Registros rejeitados</span>
                <span class="aud-v">{{ trilha.execucao.registrosRejeitados }}</span>
              </div>
            </div>
            <template v-if="trilha.execucao?.etapas?.length">
              <div class="aud-mhlbl">Etapas do pipeline</div>
              <div class="aud-etapas">
                <span v-for="(s, i) in trilha.execucao.etapas" :key="i" class="aud-etapa">{{ s }}</span>
              </div>
            </template>
            <p v-if="!trilha.execucao" class="aud-estado-inline">
              Execução não registrada para este resultado.
            </p>
          </template>

          <!-- TRANSFORMAÇÕES -->
          <template v-else-if="modalTipo === 'transformacoes'">
            <div v-if="(trilha.transformacoes || []).length">
              <div v-for="(t, i) in trilha.transformacoes" :key="i" class="aud-tr">
                <div class="aud-trn">
                  <template v-if="t.ordem != null">{{ t.ordem }}. </template>{{ t.tipo }}
                </div>
                <div v-if="t.descricao" class="aud-trd">{{ t.descricao }}</div>
              </div>
            </div>
            <p v-else class="aud-estado-inline">Nenhuma transformação registrada.</p>
          </template>

          <template v-else-if="modalTipo === 'origem'">
            <div v-if="(trilha.origem || []).length">
              <div v-for="(f, i) in trilha.origem" :key="i" class="aud-mfile">
                <div class="aud-mftop">
                  <div class="aud-mfname">{{ f.nome || `arquivo #${f.arquivoId}` }}</div>
                  <span class="aud-ori" :class="origemTipo(f.formaEntrada)">
                    {{ origemTipo(f.formaEntrada) }}
                  </span>
                </div>
                <div class="aud-mfmeta">{{ origemMeta(f) }}</div>
                <template v-if="f.hash">
                  <div class="aud-mhlbl">Impressão digital (SHA-256)</div>
                  <div class="aud-mhash">{{ f.hash }}</div>
                </template>
              </div>
            </div>
            <p v-else class="aud-estado-inline">Nenhum arquivo de origem registrado.</p>
          </template>

        </div>

        <div class="aud-modal-f">
          <button type="button" class="aud-btn-sec" @click="fecharModal">Fechar</button>
          <button ref="botaoVer" type="button" class="aud-btn" @click="irParaTela(modalTipo)">
            Ver tudo
          </button>
        </div>
      </div>
    </div>

    <ToastMensagem
      v-if="mensagem"
      :mensagem="mensagem"
      tipo="erro"
      :duracao="0"
      @fechar="fecharMensagem"
    />
  </div>
</template>

<style scoped src="../assets/css/auditoria-dados.css"></style>
