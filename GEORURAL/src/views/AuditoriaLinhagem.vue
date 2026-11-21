<script setup>
import { onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import BarraNavegacao from '../components/BarraNavegacao.vue'
import ModalDetalheAuditoria from '../components/ModalDetalheAuditoria.vue'
import {
  OPERACOES_AUDITORIA as OPERACOES,
  ENTIDADES_AUDITORIA as ENTIDADES,
} from '../services/historicoAcoesService'
import { criarControleHistorico } from '../services/historicoAcoesControleService'
defineOptions({ name: 'AuditoriaLinhagem' })
const route = useRoute()
const controle = criarControleHistorico()
const {
  dias,
  operacao,
  entidade,
  responsavel,
  busca,
  eventoSelecionado,
  carregando,
  erro,
  pagina,
  total,
  totalPaginas,
  arquivoBrutoId,
  consultarAuditoria,
  mudarPagina,
  eventosFiltrados,
  resumo,
  gruposPorDia,
  eventoMaisAntigo,
  responsaveisDisponiveis,
  abrirModal,
  fecharModal,
} = controle
watch(() => route.query.arquivoBrutoId, controle.selecionarArquivo, { immediate: true })
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

onMounted(consultarAuditoria)
onBeforeUnmount(controle.destruir)
</script>

<template>
  <div class="pg-layout">
    <BarraNavegacao />

    <main class="pg-pagina">
      <header class="pg-cabecalho">
        <h1>Quem fez o quê, e quando</h1>
        <p>
          Tudo que aconteceu na plataforma, na ordem em que aconteceu — envio de arquivo, mudança de
          regra, execução, publicação, download e acesso à API. Cada linha guarda o responsável, o
          IP e o estado antes e depois.
        </p>
      </header>

      <section class="pg-filtros" aria-label="Filtros da auditoria">
        <label class="pg-campo aud-campo-busca">
          <span>Buscar</span>
          <input v-model="busca" type="search" placeholder="Buscar no conteúdo desta página…" />
        </label>

        <label class="pg-campo">
          <span>Período</span>
          <select v-model.number="dias">
            <option :value="1">Hoje</option>
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
          <span>Entidade nesta página</span>
          <select v-model="entidade">
            <option value="">Qualquer entidade</option>
            <option v-for="ent in ENTIDADES" :key="ent" :value="ent">
              {{ ent }}
            </option>
          </select>
        </label>

        <label class="pg-campo">
          <span>Identificador do responsável</span>
          <input
            v-model="responsavel"
            type="text"
            inputmode="numeric"
            list="auditoria-responsaveis"
            placeholder="Todos os responsáveis"
            aria-label="Identificador do usuário responsável"
          />
          <datalist id="auditoria-responsaveis">
            <option v-for="u in responsaveisDisponiveis" :key="u.id" :value="u.id">
              {{ u.nome }}{{ u.automatico ? ' (automático)' : '' }}
            </option>
          </datalist>
        </label>
        <button type="button" class="pg-botao" :disabled="carregando" @click="consultarAuditoria">
          Atualizar
        </button>
      </section>

      <p class="aud-alcance">
        Busca, entidade e resumo consideram os registros da página carregada.
      </p>
      <p v-if="arquivoBrutoId" class="aud-alcance">
        Arquivo {{ arquivoBrutoId }} nesta página.
        <button type="button" class="pg-botao" @click="arquivoBrutoId = ''">
          Remover filtro do arquivo
        </button>
      </p>

      <section
        v-if="!erro && !carregando"
        class="aud-kpis"
        aria-label="Resumo da auditoria nesta página"
      >
        <article class="pg-bloco aud-kpi">
          <span class="aud-kpi-k">Ações</span>
          <strong class="aud-kpi-v">{{ fmtInteiro(resumo.total) }}</strong>
          <span class="aud-kpi-m">
            {{ dias ? 'nesta página do período selecionado' : 'nesta página' }}
          </span>
        </article>

        <article class="pg-bloco aud-kpi">
          <span class="aud-kpi-k">Mudanças de estado</span>
          <strong class="aud-kpi-v">{{ fmtInteiro(resumo.mudancas) }}</strong>
          <span class="aud-kpi-m">INSERT, UPDATE e DELETE nesta página</span>
        </article>

        <article class="pg-bloco aud-kpi">
          <span class="aud-kpi-k">Responsáveis</span>
          <strong class="aud-kpi-v">
            {{ fmtInteiro(resumo.responsaveisUnicos) }}
          </strong>
          <span class="aud-kpi-m">pessoas e integrações nesta página</span>
        </article>

        <article class="pg-bloco aud-kpi">
          <span class="aud-kpi-k">Autor AIRFLOW</span>
          <strong class="aud-kpi-v">{{ fmtInteiro(resumo.peloAirflow) }}</strong>
          <span class="aud-kpi-m">responsável registrado como AIRFLOW</span>
        </article>

        <article class="pg-bloco aud-kpi" :class="{ 'aud-kpi--alerta': resumo.exclusoes > 0 }">
          <span class="aud-kpi-k">Exclusões</span>
          <strong class="aud-kpi-v">{{ fmtInteiro(resumo.exclusoes) }}</strong>
          <span class="aud-kpi-m">registros DELETE nesta página</span>
        </article>
      </section>

      <p v-if="!dias && eventosFiltrados.length && eventoMaisAntigo" class="aud-alcance">
        Mostrando <strong>{{ fmtInteiro(eventosFiltrados.length) }}</strong>
        ação(ões), a mais antiga de
        <strong>{{ fmtDataCompleta(eventoMaisAntigo.quando) }}</strong
        >.
      </p>

      <div v-if="carregando" class="pg-bloco">
        <p class="pg-vazio">Carregando trilha de auditoria...</p>
      </div>

      <div v-else-if="erro" class="pg-bloco" role="alert">
        <p>{{ erro }}</p>
        <button type="button" class="pg-botao" @click="consultarAuditoria">Tentar novamente</button>
      </div>

      <template v-else-if="gruposPorDia.length">
        <section v-for="grupo in gruposPorDia" :key="grupo.chave" class="aud-dia">
          <div class="aud-dia-topo">
            <span class="aud-dia-titulo">
              {{ fmtDiaCabecalho(grupo.dataRef) }}
            </span>
            <span class="aud-dia-contagem"> {{ fmtInteiro(grupo.itens.length) }} ação(ões) </span>
            <span class="aud-dia-linha" />
          </div>

          <div
            v-for="ev in grupo.itens"
            :key="ev.id"
            class="aud-ev"
            :class="{ 'aud-ev--marco': ev.marco }"
            role="button"
            tabindex="0"
            @click="abrirModal(ev)"
            @keydown.enter="abrirModal(ev)"
            @keydown.space.prevent="abrirModal(ev)"
          >
            <span class="aud-hora">{{ fmtHora(ev.quando) }}</span>

            <span class="aud-op" :class="`aud-op--${ev.operacao}`">
              {{ ev.operacao }}
            </span>

            <div class="aud-txt">
              <div class="aud-resumo">{{ ev.resumo }}</div>
              <div class="aud-sub">
                {{ ev.entidade
                }}<template v-if="ev.registroId !== null && ev.registroId !== undefined">
                  · id {{ ev.registroId }}
                </template>
              </div>
            </div>

            <div class="aud-quem">
              <div class="aud-quem-nome">
                {{ ev.usuario?.nome }}
                <span v-if="ev.usuario?.automatico" class="aud-auto">AIRFLOW</span>
              </div>
              <div class="pg-mono aud-quem-ip">{{ ev.usuario?.ip }}</div>
            </div>
          </div>
        </section>
      </template>

      <div v-else class="pg-bloco">
        <p class="pg-vazio">Nenhum registro encontrado nesta página com os filtros selecionados.</p>
      </div>
      <nav v-if="!erro" class="aud-paginacao" aria-label="Páginas do histórico">
        <span
          >{{ fmtInteiro(total) }} registro(s) no filtro · Página
          {{ totalPaginas ? pagina + 1 : 0 }} de {{ totalPaginas }}</span
        >
        <button
          type="button"
          class="pg-botao"
          :disabled="carregando || pagina === 0"
          @click="mudarPagina(pagina - 1)"
        >
          Anterior
        </button>
        <button
          type="button"
          class="pg-botao"
          :disabled="carregando || pagina + 1 >= totalPaginas"
          @click="mudarPagina(pagina + 1)"
        >
          Próxima
        </button>
      </nav>
    </main>

    <ModalDetalheAuditoria :evento="eventoSelecionado" @fechar="fecharModal" />
  </div>
</template>

<style scoped src="../assets/css/auditoria-linhagem.css"></style>
