<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

import BarraNavegacao from '../components/BarraNavegacao.vue'
import ToastMensagem from '../components/ToastMensagem.vue'

import {
  qualidadeIndicadoresService,
  requisicaoIndicadoresCancelada,
} from '../services/qualidadeIndicadoresService'

defineOptions({ name: 'QualidadeDadosPagina' })

const filtro = ref('TODOS')
const lista = ref([])
const selecionado = ref(null)
const resultados = ref([])

const carregando = ref(false)
const consultado = ref(false)
const carregandoDetalhe = ref(false)
const mensagem = ref('')

let consultaLista = null
let consultaDetalhe = null
let destruido = false

function chaveItem(item) {
  return `${item.indicadorSigla}-${item.versaoId}`
}

function formatarPercentual(valor) {
  return typeof valor === 'number' && Number.isFinite(valor)
    ? `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
    : '—'
}

function formatarHectares(valor) {
  return typeof valor === 'number' && Number.isFinite(valor)
    ? `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ha`
    : '—'
}

function formatarData(valor) {
  if (!valor) return 'Não informada'
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return String(valor)
  return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function parametro(p) {
  const unidade = p?.unidade ? ` ${p.unidade}` : ''
  return `${p?.nome ?? 'parâmetro'}: ${p?.valor ?? '—'}${unidade}`
}

function situacaoTexto(situacao) {
  const s = String(situacao ?? '').toUpperCase()
  if (s === 'VIGENTE') return 'Vigente'
  if (s === 'ANTERIOR') return 'Anterior'
  return situacao || 'Não informada'
}

function situacaoClasse(situacao) {
  const s = String(situacao ?? '').toUpperCase()
  if (s === 'VIGENTE') return 'vigente'
  if (s === 'ANTERIOR') return 'anterior'
  return 'neutro'
}

async function carregarLista() {
  if (destruido) return
  consultaLista?.abort()
  const atual = new AbortController()
  consultaLista = atual

  carregando.value = true
  mensagem.value = ''

  try {
    const dados = await qualidadeIndicadoresService.listar(filtro.value, { signal: atual.signal })
    if (destruido || atual.signal.aborted || consultaLista !== atual) return

    lista.value = dados
    consultado.value = true

    const aindaExiste = selecionado.value
      && dados.some((item) => chaveItem(item) === chaveItem(selecionado.value))
    if (aindaExiste) {
      const atualizado = dados.find((item) => chaveItem(item) === chaveItem(selecionado.value))
      selecionar(atualizado)
    } else if (dados.length) {
      selecionar(dados[0])
    } else {
      selecionado.value = null
      resultados.value = []
    }
  } catch (erro) {
    if (destruido || atual.signal.aborted || requisicaoIndicadoresCancelada(erro)) return
    mensagem.value = erro.message
  } finally {
    if (!destruido && consultaLista === atual) {
      carregando.value = false
      consultaLista = null
    }
  }
}

async function carregarDetalhe(item) {
  if (destruido || !item) return
  consultaDetalhe?.abort()
  const atual = new AbortController()
  consultaDetalhe = atual

  carregandoDetalhe.value = true
  resultados.value = []

  try {
    const dados = await qualidadeIndicadoresService.resultados(
      item.versaoId,
      item.indicadorSigla,
      { signal: atual.signal },
    )
    if (destruido || atual.signal.aborted || consultaDetalhe !== atual) return
    resultados.value = dados
  } catch (erro) {
    if (destruido || atual.signal.aborted || requisicaoIndicadoresCancelada(erro)) return
    mensagem.value = erro.message
  } finally {
    if (!destruido && consultaDetalhe === atual) {
      carregandoDetalhe.value = false
      consultaDetalhe = null
    }
  }
}

function selecionar(item) {
  selecionado.value = item
  carregarDetalhe(item)
}

function setFiltro(valor) {
  filtro.value = valor
  carregarLista()
}

function fecharMensagem() {
  mensagem.value = ''
}

function destruir() {
  destruido = true
  consultaLista?.abort()
  consultaDetalhe?.abort()
}

onMounted(carregarLista)
onBeforeUnmount(destruir)
</script>

<template>
  <div class="pub-layout">
    <BarraNavegacao />

    <main class="pub-pagina">
      <header class="pub-cabecalho">
        <h1>Indicadores publicados</h1>
        <p>
          Os indicadores calculados (IRL e IAE) e as versões geradas a cada processamento.
          Quando a regra muda e o dado é reprocessado, uma nova versão é publicada e a anterior
          continua listada.
        </p>
      </header>

      <section class="pub-card pub-filtros" :aria-busy="carregando">
        <div class="pub-campo">
          <label for="pub-indicador">Indicador</label>
          <select id="pub-indicador" :value="filtro" @change="setFiltro($event.target.value)">
            <option value="TODOS">Todos os indicadores</option>
            <option value="IAE">IAE — Área embargada</option>
            <option value="IRL">IRL — Reserva legal</option>
          </select>
        </div>

        <button type="button" class="pub-botao" :disabled="carregando" @click="carregarLista">
          {{ carregando ? 'Consultando...' : 'Atualizar' }}
        </button>
      </section>

      <div class="pub-split">
        <div class="pub-listcard">
          <div class="pub-lhead">Versões publicadas</div>

          <p v-if="carregando" class="pub-estado" role="status">Consultando indicadores...</p>

          <template v-else-if="consultado">
            <p v-if="!lista.length" class="pub-estado">
              Nenhum indicador publicado ainda. Processe um imóvel/RL/embargo para gerar os indicadores.
            </p>

            <button
              v-for="item in lista"
              v-else
              :key="chaveItem(item)"
              type="button"
              class="pub-item"
              :class="{ 'pub-item--ativo': selecionado && chaveItem(selecionado) === chaveItem(item) }"
              @click="selecionar(item)"
            >
              <span class="pub-item-grow">
                <span class="pub-item-nome">{{ item.indicadorSigla }} · {{ item.indicadorNome }}</span>
                <span class="pub-item-meta">
                  versão v{{ item.versaoNumero }}
                  <template v-if="item.regraVersao"> · regra {{ item.regraVersao }}</template>
                  · {{ item.totalImoveis }} imóvel(is)
                </span>
              </span>
              <span class="pub-chip" :class="`pub-chip--${situacaoClasse(item.versaoSituacao)}`">
                {{ situacaoTexto(item.versaoSituacao) }}
              </span>
            </button>
          </template>
        </div>

        <div class="pub-detail">
          <p v-if="!selecionado" class="pub-detail-vazio">
            Selecione uma versão à esquerda para ver a regra usada e os resultados por imóvel.
          </p>

          <template v-else>
            <header class="pub-detail-head">
              <h2>{{ selecionado.indicadorSigla }} · {{ selecionado.indicadorNome }}</h2>
              <p>
                Versão v{{ selecionado.versaoNumero }} ·
                {{ situacaoTexto(selecionado.versaoSituacao) }} ·
                calculado em {{ formatarData(selecionado.dataCalculo) }}
              </p>
            </header>

            <section class="pub-regra">
              <p class="pub-sectitle">
                Regra de cálculo{{ selecionado.regraVersao ? ` (${selecionado.regraVersao})` : '' }}
              </p>
              <ul v-if="selecionado.regraParametros && selecionado.regraParametros.length" class="pub-params">
                <li v-for="(p, i) in selecionado.regraParametros" :key="i">{{ parametro(p) }}</li>
              </ul>
              <p v-else class="pub-estado-inline">Regra não informada para esta versão.</p>
            </section>

            <section>
              <p class="pub-sectitle">Resultados por imóvel ({{ resultados.length }})</p>

              <p v-if="carregandoDetalhe" class="pub-estado-inline" role="status">Consultando resultados...</p>

              <p v-else-if="!resultados.length" class="pub-estado-inline">
                Nenhum resultado para esta versão.
              </p>

              <div v-else class="pub-tabela-container" role="region" aria-label="Resultados por imóvel" tabindex="0">
                <table class="pub-tabela">
                  <thead>
                    <tr>
                      <th scope="col">CAR</th>
                      <th scope="col">Município</th>
                      <th scope="col">Valor (%)</th>
                      <th scope="col">Valor (ha)</th>
                      <th scope="col">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="r in resultados" :key="r.resultadoId">
                      <th scope="row">{{ r.codigoCar || '—' }}</th>
                      <td>{{ r.municipio || '—' }}</td>
                      <td>{{ formatarPercentual(r.valorPercentual) }}</td>
                      <td>{{ formatarHectares(r.valorHectares) }}</td>
                      <td>{{ r.situacao || '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </template>
        </div>
      </div>
    </main>

    <ToastMensagem
      v-if="mensagem"
      :mensagem="mensagem"
      tipo="erro"
      :duracao="0"
      @fechar="fecharMensagem"
    />
  </div>
</template>

<style scoped>
.pub-layout {
  min-width: 0;
  min-height: 100vh;
}

.pub-pagina {
  box-sizing: border-box;
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  padding: 30px 28px 60px;
  color: var(--cor-texto, #24202d);
}

.pub-cabecalho {
  margin-bottom: 20px;
}

.pub-cabecalho h1 {
  margin: 0 0 8px;
  font-size: 26px;
  font-weight: 700;
}

.pub-cabecalho p {
  margin: 0;
  max-width: 760px;
  color: var(--cor-texto-secundario, #686273);
  font-size: 13px;
  line-height: 1.7;
}

.pub-card,
.pub-listcard,
.pub-detail {
  border: 1px solid var(--cor-borda, #ded8e7);
  border-radius: 14px;
  background: var(--cor-painel, #fff);
}

.pub-filtros {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  padding: 16px 18px;
  margin-bottom: 16px;
}

.pub-campo {
  flex: 1;
  min-width: 0;
}

.pub-campo label {
  display: block;
  margin-bottom: 7px;
  font-size: 12px;
  font-weight: 600;
}

.pub-campo select {
  box-sizing: border-box;
  width: 100%;
  min-height: 40px;
  padding: 9px 11px;
  border: 1px solid var(--cor-borda, #ded8e7);
  border-radius: 8px;
  background: var(--cor-painel, #fff);
  color: var(--cor-texto, #24202d);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.pub-botao {
  min-height: 40px;
  padding: 9px 14px;
  border: 1px solid var(--cor-borda, #ded8e7);
  border-radius: 8px;
  background: var(--cor-painel, #fff);
  color: var(--cor-roxo, #8520bd);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.pub-botao:hover:not(:disabled) {
  border-color: var(--cor-roxo, #8520bd);
  background: var(--cor-menu-hover, #f6f0fb);
}

.pub-botao:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pub-split {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 16px;
  align-items: start;
}

.pub-listcard {
  overflow: hidden;
}

.pub-lhead {
  padding: 12px 16px;
  border-bottom: 1px solid var(--cor-borda, #ded8e7);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--cor-texto-secundario, #686273);
}

.pub-item {
  display: flex;
  gap: 11px;
  align-items: center;
  width: 100%;
  text-align: left;
  padding: 13px 15px;
  border: none;
  border-top: 1px solid var(--cor-borda, #ded8e7);
  background: var(--cor-painel, #fff);
  font: inherit;
  cursor: pointer;
}

.pub-item:first-of-type {
  border-top: none;
}

.pub-item:hover {
  background: var(--cor-menu-hover, #f6f0fb);
}

.pub-item--ativo {
  background: var(--cor-menu-hover, #f6f0fb);
  box-shadow: inset 3px 0 0 var(--cor-roxo, #8520bd);
}

.pub-item-grow {
  flex: 1;
  min-width: 0;
}

.pub-item-nome {
  display: block;
  font-size: 12.5px;
  font-weight: 700;
}

.pub-item-meta {
  display: block;
  margin-top: 3px;
  font-size: 11px;
  color: var(--cor-texto-secundario, #686273);
  font-weight: 600;
}

.pub-chip {
  flex: none;
  font-size: 10px;
  font-weight: 800;
  padding: 3px 9px;
  border-radius: 999px;
  white-space: nowrap;
}

.pub-chip--vigente {
  background: rgba(133, 32, 189, 0.12);
  color: var(--cor-roxo, #8520bd);
}

.pub-chip--anterior {
  background: var(--cor-painel-secundario, #f0edf5);
  color: var(--cor-texto-secundario, #686273);
}

.pub-chip--neutro {
  background: var(--cor-painel-secundario, #f0edf5);
  color: var(--cor-texto-secundario, #686273);
}

.pub-detail {
  padding: 22px 24px;
}

.pub-detail-vazio {
  margin: 0;
  padding: 40px 16px;
  text-align: center;
  color: var(--cor-texto-secundario, #686273);
  font-size: 13px;
}

.pub-detail-head {
  border-bottom: 1px solid var(--cor-borda, #ded8e7);
  padding-bottom: 14px;
  margin-bottom: 16px;
}

.pub-detail-head h2 {
  margin: 0 0 4px;
  font-size: 17px;
  font-weight: 800;
}

.pub-detail-head p {
  margin: 0;
  font-size: 12px;
  color: var(--cor-texto-secundario, #686273);
  font-weight: 600;
}

.pub-regra {
  margin-bottom: 20px;
}

.pub-sectitle {
  margin: 0 0 10px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--cor-texto-secundario, #686273);
  font-weight: 800;
}

.pub-params {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pub-params li {
  background: var(--cor-painel-secundario, #f0edf5);
  border: 1px solid var(--cor-borda, #ded8e7);
  border-radius: 999px;
  padding: 5px 11px;
  font-size: 12px;
  font-weight: 700;
}

.pub-estado,
.pub-estado-inline {
  margin: 0;
  color: var(--cor-texto-secundario, #686273);
  font-size: 13px;
  line-height: 1.6;
}

.pub-estado {
  padding: 28px 14px;
  text-align: center;
}

.pub-tabela-container {
  overflow-x: auto;
  border: 1px solid var(--cor-borda, #ded8e7);
  border-radius: 10px;
}

.pub-tabela {
  width: 100%;
  min-width: 560px;
  border-collapse: collapse;
  font-size: 12px;
}

.pub-tabela th,
.pub-tabela td {
  padding: 11px 13px;
  text-align: left;
  vertical-align: top;
  overflow-wrap: anywhere;
}

.pub-tabela thead {
  background: var(--cor-painel-secundario, #f0edf5);
  color: var(--cor-texto-secundario, #686273);
}

.pub-tabela tbody th,
.pub-tabela tbody td {
  border-top: 1px solid var(--cor-borda, #ded8e7);
  font-weight: 600;
}

@media (max-width: 820px) {
  .pub-split {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .pub-pagina {
    padding: 24px 16px 48px;
  }

  .pub-filtros {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
