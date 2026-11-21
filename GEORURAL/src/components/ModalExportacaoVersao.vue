<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ToastMensagem from './ToastMensagem.vue'
import {
  baixarExportacao,
  cancelarTransferencia,
  exportacao,
  iniciarExportacao,
  modalExportacaoAberto,
} from '../services/exportacaoVersaoControle'

const rota = useRoute()
const dialogo = ref(null)
const fechar = ref(null)
const acao = ref(null)

const estados = {
  preparando: 'Preparando o arquivo…',
  recebendo: 'Recebendo o arquivo…',
  pronto: 'Arquivo pronto',
  'download-iniciado': 'Arquivo enviado para download',
  erro: 'Falha na exportação',
  cancelado: 'Transferência cancelada',
}
const estado = computed(() => exportacao.value?.estado)
const emAndamento = computed(() => ['preparando', 'recebendo'].includes(estado.value))
const temNotificacao = computed(() => ['pronto', 'erro'].includes(estado.value))

function tentarNovamente() {
  const { versao, formato } = exportacao.value
  iniciarExportacao(versao, formato)
}

function fecharNotificacao() {
  exportacao.value = null
}

watch(
  () => rota.fullPath,
  () => {
    modalExportacaoAberto.value = false
  },
)

watch(
  modalExportacaoAberto,
  (aberto) => {
    if (aberto && !dialogo.value.open) dialogo.value.showModal()
    if (!aberto && dialogo.value.open) dialogo.value.close()
  },
  { flush: 'post' },
)

watch(
  estado,
  () => {
    if (dialogo.value?.open && !dialogo.value.contains(document.activeElement)) {
      const destino = acao.value ?? fechar.value
      destino?.focus()
    }
  },
  { flush: 'post' },
)
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialogo"
      class="exportacao-dialogo"
      aria-labelledby="exportacao-titulo"
      @cancel.prevent="modalExportacaoAberto = false"
    >
      <div v-if="exportacao">
        <header>
          <h2 id="exportacao-titulo">Exportar dados</h2>
          <button
            ref="fechar"
            class="exportacao-acao"
            type="button"
            autofocus
            @click="modalExportacaoAberto = false"
          >
            Fechar
          </button>
        </header>
        <p>
          {{ exportacao.versao.conjuntoNome }} · Versão #{{
            exportacao.versao.numero ?? exportacao.versao.id
          }}
        </p>
        <dl>
          <div>
            <dt>Arquivo</dt>
            <dd>{{ exportacao.nome }}</dd>
          </div>
          <div>
            <dt>Formato</dt>
            <dd>{{ exportacao.formato.rotulo ?? exportacao.formato.id }}</dd>
          </div>
        </dl>
        <progress v-if="emAndamento" aria-label="Progresso da transferência"></progress>
        <p role="status">{{ estados[estado] }}</p>
        <p v-if="estado === 'erro'" role="alert">{{ exportacao.mensagem }}</p>
        <footer>
          <button
            v-if="emAndamento"
            class="exportacao-acao"
            type="button"
            @click="cancelarTransferencia"
          >
            Cancelar transferência
          </button>
          <button
            v-else-if="temNotificacao"
            ref="acao"
            class="exportacao-acao exportacao-acao--principal"
            type="button"
            @click="estado === 'pronto' ? baixarExportacao() : tentarNovamente()"
          >
            {{ estado === 'pronto' ? 'Baixar arquivo' : 'Tentar novamente' }}
          </button>
        </footer>
      </div>
    </dialog>
  </Teleport>

  <ToastMensagem
    v-if="temNotificacao && !modalExportacaoAberto"
    :titulo="estados[estado]"
    :mensagem="estado === 'pronto' ? exportacao.nome : exportacao.mensagem"
    :tipo="estado === 'pronto' ? 'sucesso' : 'erro'"
    :duracao="0"
    @fechar="fecharNotificacao"
  >
    <template #acao>
      <button
        class="exportacao-acao exportacao-acao--principal exportacao-toast-acao"
        type="button"
        @click="estado === 'pronto' ? baixarExportacao() : tentarNovamente()"
      >
        {{ estado === 'pronto' ? 'Baixar arquivo' : 'Tentar novamente' }}
      </button>
    </template>
  </ToastMensagem>
</template>

<style scoped src="../assets/css/exportacao-versao.css"></style>
