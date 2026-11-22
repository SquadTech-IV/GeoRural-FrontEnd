<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { prepararDetalheAuditoria } from '../services/historicoAcoesService'

defineOptions({
  name: 'ModalDetalheAuditoria',
})

const props = defineProps({
  evento: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['fechar'])

const operacaoInfo = computed(() => prepararDetalheAuditoria(props.evento))
const chaves = computed(() => operacaoInfo.value.chaves)
const caixa = ref(null)
let anterior = null
let overflow = ''
function restaurar() {
  if (anterior) {
    document.body.style.overflow = overflow
    anterior.focus?.()
    anterior = null
  }
}
watch(
  () => props.evento,
  async (evento) => {
    if (!evento) {
      restaurar()
      return
    }
    if (!anterior) {
      anterior = document.activeElement
      overflow = document.body.style.overflow
    }
    document.body.style.overflow = 'hidden'
    await nextTick()
    if (props.evento) caixa.value?.querySelector('button')?.focus()
  },
  { immediate: true },
)
onBeforeUnmount(restaurar)
function tratarTeclado(evento) {
  if (evento.key === 'Escape') {
    evento.preventDefault()
    emit('fechar')
    return
  }
  if (evento.key !== 'Tab') return
  const botoes = [...caixa.value.querySelectorAll('button')].filter((botao) => !botao.disabled)
  const primeiro = botoes[0],
    ultimo = botoes.at(-1)
  if (evento.shiftKey && document.activeElement === primeiro) {
    evento.preventDefault()
    ultimo?.focus()
  } else if (!evento.shiftKey && document.activeElement === ultimo) {
    evento.preventDefault()
    primeiro?.focus()
  }
}

function fmtDataHora(valor) {
  if (!valor) return '—'
  const d = valor instanceof Date ? valor : new Date(valor)
  if (Number.isNaN(d.getTime())) return String(valor)
  return d.toLocaleString('pt-BR')
}

function ehDiferente(chave) {
  return (
    JSON.stringify(props.evento?.antigos?.[chave]) !== JSON.stringify(props.evento?.novos?.[chave])
  )
}
</script>

<template>
  <div
    v-if="evento"
    class="pg-modal"
    role="dialog"
    aria-modal="true"
    aria-labelledby="auditoria-detalhe-titulo"
    @keydown="tratarTeclado"
    @click.self="emit('fechar')"
  >
    <div ref="caixa" class="pg-modal-caixa">
      <header>
        <div>
          <h2 id="auditoria-detalhe-titulo">
            {{ operacaoInfo.rot }} · {{ evento.entidade }}
            <span
              v-if="evento.registroId !== null && evento.registroId !== undefined"
              class="pg-mono aud-titulo-id"
            >
              #{{ evento.registroId }}
            </span>
          </h2>
          <p>
            <span class="pg-mono">aud_id {{ evento.id }}</span> · {{ evento.usuario?.nome }} ·
            {{ fmtDataHora(evento.quando) }} ·
            <span class="pg-mono">{{ evento.usuario?.ip }}</span>
          </p>
        </div>
        <button type="button" class="pg-botao" @click="emit('fechar')">Fechar</button>
      </header>

      <div class="aud-modal-meta">
        <div>
          <span>Operação</span>
          <strong>{{ evento.operacao }}</strong>
        </div>
        <div>
          <span>Responsável</span>
          <strong>{{ evento.usuario?.nome }}</strong>
        </div>
        <div>
          <span>usu_id</span>
          <strong>{{ evento.usuario?.id ?? '—' }}</strong>
        </div>
        <div>
          <span>IP de origem</span>
          <strong class="pg-mono">{{ evento.usuario?.ip ?? '—' }}</strong>
        </div>
      </div>

      <div v-if="!operacaoInfo.lados.length" class="aud-semlado">
        <strong>Sem dados anteriores ou posteriores registrados para esta ação.</strong>
      </div>

      <div v-else-if="operacaoInfo.lados.length === 1" class="aud-modal-secao">
        <h3>
          {{
            operacaoInfo.lados[0] === 'novos'
              ? 'Dados posteriores registrados'
              : 'Dados anteriores registrados'
          }}
        </h3>

        <div class="aud-dtab aud-dtab--unico">
          <template
            v-for="(valor, chave) in operacaoInfo.lados[0] === 'novos'
              ? evento.novos
              : evento.antigos"
            :key="chave"
          >
            <div class="aud-dk">{{ chave }}</div>
            <div class="aud-dv aud-dv--dif">
              <span v-if="valor === null" class="aud-nd">nulo</span>
              <template v-else>{{ JSON.stringify(valor) }}</template>
            </div>
          </template>
        </div>

        <div class="aud-semlado" style="margin-top: 12px">
          <template v-if="operacaoInfo.lados[0] === 'novos'">
            <strong>Sem «antes».</strong>
            Não foram registrados dados anteriores para esta ação.
          </template>
          <template v-else>
            <strong>Sem «depois».</strong> Não foram registrados dados posteriores para esta ação.
          </template>
        </div>
      </div>

      <div v-else class="aud-modal-secao">
        <h3>O que mudou</h3>

        <div class="aud-dtab">
          <div class="aud-dh" />
          <div class="aud-dh">Antes</div>
          <div class="aud-dh">Depois</div>

          <template v-for="chave in chaves" :key="chave">
            <div class="aud-dk">{{ chave }}</div>

            <div class="aud-dv aud-dv--a" :class="{ 'aud-dv--dif': ehDiferente(chave) }">
              <span v-if="evento.antigos?.[chave] === undefined" class="aud-nd"> não existia </span>
              <span v-else-if="evento.antigos?.[chave] === null" class="aud-nd"> nulo </span>
              <template v-else>{{ JSON.stringify(evento.antigos[chave]) }}</template>
            </div>

            <div class="aud-dv aud-dv--b" :class="{ 'aud-dv--dif': ehDiferente(chave) }">
              <span v-if="evento.novos?.[chave] === undefined" class="aud-nd"> não existia </span>
              <span v-else-if="evento.novos?.[chave] === null" class="aud-nd"> nulo </span>
              <template v-else>{{ JSON.stringify(evento.novos[chave]) }}</template>
            </div>
          </template>
        </div>
      </div>

      <div v-if="evento.usuario?.automatico" class="aud-consq">
        <span class="aud-ci">A</span>
        <div>
          <strong>Responsável registrado como AIRFLOW.</strong>
          A trilha não informa um identificador de usuário para este evento.
        </div>
      </div>

      <div
        v-if="evento.entidade === 'VERSAO' && evento.novos?.acao === 'REPROVACAO'"
        class="aud-consq"
      >
        <span class="aud-ci">!</span>
        <div>
          <strong>Registo de reprovação.</strong>
          Os dados registrados assinalam uma reprovação na revisão da qualidade.
        </div>
      </div>

      <div
        v-if="
          evento.entidade === 'USUARIO' &&
          evento.operacao === 'UPDATE' &&
          evento.antigos?.per_id !== evento.novos?.per_id
        "
        class="aud-consq"
      >
        <span class="aud-ci">!</span>
        <div>
          <strong>Mudança de perfil.</strong>
          O responsável alterou o nível de acesso associado ao utilizador.
        </div>
      </div>

      <div class="pg-modal-rodape">
        <span class="pg-ajuda" style="margin: 0"> Registo imutável da trilha de auditoria. </span>
        <button type="button" class="pg-botao" @click="emit('fechar')">Fechar</button>
      </div>
    </div>
  </div>
</template>

<style scoped src="../assets/css/auditoria-linhagem.css"></style>
