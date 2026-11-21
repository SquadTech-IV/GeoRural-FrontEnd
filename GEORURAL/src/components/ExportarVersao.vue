<script setup>
import { computed, ref } from 'vue'
import { formatosExportacao } from '../services/exportacaoVersaoService'
import {
  exportacao,
  iniciarExportacao,
  modalExportacaoAberto,
} from '../services/exportacaoVersaoControle'

const props = defineProps({ versao: { type: Object, required: true } })
const menu = ref(null)
const botao = ref(null)
const emAndamento = computed(() => ['preparando', 'recebendo'].includes(exportacao.value?.estado))

function fecharMenu() {
  if (!menu.value.open) return
  menu.value.open = false
  botao.value.focus()
}

function escolher(formato) {
  fecharMenu()
  iniciarExportacao(props.versao, formato)
}

function abrirAndamento(evento) {
  if (!emAndamento.value) return
  evento.preventDefault()
  botao.value.focus()
  modalExportacaoAberto.value = true
}

function sairDoMenu(evento) {
  if (!menu.value.contains(evento.relatedTarget)) menu.value.open = false
}
</script>

<template>
  <details ref="menu" class="exportacao-menu" @keydown.esc.stop="fecharMenu" @focusout="sairDoMenu">
    <summary ref="botao" class="exportacao-acao exportacao-acao--principal" @click="abrirAndamento">
      {{ emAndamento ? 'Ver exportação em andamento' : 'Exportar dados' }}
      <span v-if="!emAndamento" aria-hidden="true">▾</span>
    </summary>
    <ul aria-label="Formatos de exportação">
      <li v-for="formato in formatosExportacao" :key="formato.id">
        <button type="button" @click="escolher(formato)">
          <strong>{{ formato.rotulo ?? formato.id }}</strong>
          <span>{{ formato.descricao }}</span>
        </button>
      </li>
    </ul>
  </details>
</template>

<style scoped src="../assets/css/exportacao-versao.css"></style>
