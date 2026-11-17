<script setup>
import { computed } from 'vue'

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

const OPERACOES = {
  INSERT: { rot: 'Criou', lados: ['novos'] },
  UPDATE: { rot: 'Alterou', lados: ['antigos', 'novos'] },
  DELETE: { rot: 'Apagou', lados: ['antigos'] },
  LOGIN: { rot: 'Entrou', lados: [] },
  LOGOUT: { rot: 'Saiu', lados: [] },
  EXPORT: { rot: 'Exportou', lados: ['novos'] },
  DOWNLOAD: { rot: 'Baixou', lados: [] },
  API_ACCESS: { rot: 'Chamou a API', lados: [] },
}

const operacaoInfo = computed(
  () => OPERACOES[props.evento?.operacao] ?? { rot: props.evento?.operacao ?? '', lados: [] }
)

const chaves = computed(() => {
  if (!props.evento) return []
  return [
    ...new Set([
      ...Object.keys(props.evento.antigos ?? {}),
      ...Object.keys(props.evento.novos ?? {}),
    ]),
  ]
})

function fmtDataHora(valor) {
  if (!valor) return '—'
  const d = valor instanceof Date ? valor : new Date(valor)
  if (Number.isNaN(d.getTime())) return String(valor)
  return d.toLocaleString('pt-BR')
}

function ehDiferente(chave) {
  return (
    JSON.stringify(props.evento?.antigos?.[chave]) !==
    JSON.stringify(props.evento?.novos?.[chave])
  )
}
</script>

<template>
  <div
    v-if="evento"
    class="pg-modal"
    role="dialog"
    aria-modal="true"
    @click.self="emit('fechar')"
  >
    <div class="pg-modal-caixa" style="width: min(44rem, 100%)">
      <header>
        <div>
          <h2>
            {{ operacaoInfo.rot }} · {{ evento.entidade }}
            <span
              v-if="evento.registroId !== null && evento.registroId !== undefined"
              class="pg-mono aud-titulo-id"
            >
              #{{ evento.registroId }}
            </span>
          </h2>
          <p>
            <span class="pg-mono">aud_id {{ evento.id }}</span> ·
            {{ evento.usuario?.nome }} · {{ fmtDataHora(evento.quando) }} ·
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
        <strong>Esta operação não muda estado.</strong>
        <span class="pg-mono">{{ evento.operacao }}</span> é um evento: regista que
        algo aconteceu, com quem e quando. Por isso
        <span class="pg-mono">aud_dados_antigos</span> e
        <span class="pg-mono">aud_dados_novos</span> ficam nulos — não há «antes» nem
        «depois» para comparar.
      </div>

      <div v-else-if="operacaoInfo.lados.length === 1" class="aud-modal-secao">
        <h3>
          {{
            operacaoInfo.lados[0] === 'novos'
              ? 'Estado criado'
              : 'Estado que existia antes de apagar'
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
            <span class="pg-mono">{{ evento.operacao }}</span> cria o registo, pelo
            que <span class="pg-mono">aud_dados_antigos</span> é nulo por definição.
          </template>
          <template v-else>
            <strong>Sem «depois».</strong> O registo deixou de existir — a trilha
            guarda o estado anterior completo para preservação da evidência.
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

            <div
              class="aud-dv aud-dv--a"
              :class="{ 'aud-dv--dif': ehDiferente(chave) }"
            >
              <span
                v-if="evento.antigos?.[chave] === undefined"
                class="aud-nd"
              >
                não existia
              </span>
              <span
                v-else-if="evento.antigos?.[chave] === null"
                class="aud-nd"
              >
                nulo
              </span>
              <template v-else>{{ JSON.stringify(evento.antigos[chave]) }}</template>
            </div>

            <div
              class="aud-dv aud-dv--b"
              :class="{ 'aud-dv--dif': ehDiferente(chave) }"
            >
              <span
                v-if="evento.novos?.[chave] === undefined"
                class="aud-nd"
              >
                não existia
              </span>
              <span
                v-else-if="evento.novos?.[chave] === null"
                class="aud-nd"
              >
                nulo
              </span>
              <template v-else>{{ JSON.stringify(evento.novos[chave]) }}</template>
            </div>
          </template>
        </div>
      </div>

      <div v-if="evento.usuario?.automatico" class="aud-consq">
        <span class="aud-ci">A</span>
        <div>
          <strong>Ação automática.</strong>
          Executada pela conta de serviço do Airflow nas etapas automáticas do
          pipeline, deixando a versão em <span class="pg-mono">RASCUNHO</span> para
          revisão e publicação manual.
        </div>
      </div>

      <div
        v-if="evento.entidade === 'VERSAO' && evento.novos?.acao === 'REPROVACAO'"
        class="aud-consq"
      >
        <span class="aud-ci">!</span>
        <div>
          <strong>Registo de reprovação.</strong>
          A versão permanece em <span class="pg-mono">RASCUNHO</span> e este evento
          assinala a reprovação na revisão da qualidade.
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
        <span class="pg-ajuda" style="margin: 0">
          Registo imutável da trilha de auditoria.
        </span>
        <button type="button" class="pg-botao" @click="emit('fechar')">
          Fechar
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped src="../assets/css/auditoria-linhagem.css"></style>
