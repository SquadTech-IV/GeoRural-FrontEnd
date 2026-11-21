<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { prepararFormularioUsuario } from '../services/usuarioService'
const props = defineProps({
  aberto: { type: Boolean, default: false }, usuario: { type: Object, default: null },
  perfis: { type: Array, default: () => [] }, salvando: { type: Boolean, default: false },
  erroServidor: { type: String, default: '' },
})
const emit = defineEmits(['update:aberto', 'salvar'])
const dialog = ref(null)
const erro = ref('')
const formulario = reactive({ nome: '', email: '', perfilId: '' })
const editando = computed(() => props.usuario !== null)
const titulo = computed(() => editando.value ? 'Editar usu\u00e1rio' : 'Novo usu\u00e1rio')
const descricaoPerfil = computed(() => props.perfis.find(p => p.id === formulario.perfilId)?.descricao || '')
watch(() => props.aberto, async aberto => {
  if (!aberto) { dialog.value?.close(); return }
  Object.assign(formulario, { nome: props.usuario?.nome ?? '', email: props.usuario?.email ?? '', perfilId: props.usuario?.perfilId ?? '' })
  erro.value = ''
  await nextTick()
  if (props.aberto && dialog.value && !dialog.value.open) dialog.value.showModal()
}, { immediate: true })
function fechar() {
  if (props.salvando) return
  dialog.value?.close()
  emit('update:aberto', false)
}
function aoFechar() { if (props.aberto && !props.salvando) emit('update:aberto', false) }
function salvar() {
  if (props.salvando) return
  erro.value = ''
  try {
    prepararFormularioUsuario(formulario, props.perfis, props.usuario)
    emit('salvar', { ...formulario })
  } catch (falha) { erro.value = falha.message }
}
</script>

<template>
  <dialog
    ref="dialog"
    class="user-modal"
    aria-labelledby="modal-title"
    aria-describedby="modal-description"
    @cancel.prevent="fechar"
    @close="aoFechar"
  >
    <form class="modal-form" :aria-busy="salvando" @submit.prevent="salvar">
      <header class="modal-header">
        <div>
          <h2 id="modal-title">{{ titulo }}</h2>

          <p id="modal-description">
            {{
              editando
                ? 'Atualize os dados e o perfil de acesso.'
                : 'Preencha os dados e defina o perfil de acesso.'
            }}
          </p>
        </div>

        <button
          class="icon-button"
          type="button"
          aria-label="Fechar modal"
          :disabled="salvando"
          @click="fechar"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </header>

      <div class="modal-fields">
        <div class="form-field">
          <label for="user-name">Nome completo</label>

          <input
            id="user-name"
            v-model="formulario.nome"
            name="name"
            type="text"
            autocomplete="name"
            maxlength="120"
            :disabled="salvando"
            placeholder="Nome do usuário"
            required
          />
        </div>

        <div class="form-field">
          <label for="user-email">E-mail</label>

          <input
            id="user-email"
            v-model="formulario.email"
            name="email"
            type="email"
            autocomplete="email"
            maxlength="160"
            :disabled="salvando || editando"
            placeholder="usuario@exemplo.com"
            required
          />
          <p v-if="editando" class="field-help">O e-mail não pode ser alterado.</p>
        </div>

        <div class="form-field">
          <label for="user-role">Perfil de acesso</label>

          <select
            id="user-role"
            v-model="formulario.perfilId"
            :disabled="salvando"
            name="role"
            aria-describedby="role-description"
            required
          >
            <option value="" disabled>Selecione um perfil</option>
            <option v-for="perfil in perfis" :key="perfil.id" :value="perfil.id">{{ perfil.nome }}</option>
          </select>

          <p id="role-description" class="field-help">
            {{ descricaoPerfil }}
          </p>
        </div>

        <p class="field-help">
          {{ editando ? 'A troca de perfil encerra as sessões deste usuário. Altere o status pela lista de usuários.' : 'O novo usuário inicia ativo e recebe um convite por e-mail para definir a senha.' }}
        </p>

        <p v-if="erro || erroServidor" class="form-error" role="alert">
          {{ erro || erroServidor }}
        </p>
      </div>

      <footer class="modal-footer">
        <button class="button secondary" type="button" :disabled="salvando" @click="fechar">
          Cancelar
        </button>

        <button class="button primary" type="submit" :disabled="salvando || !perfis.length">
          {{ salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Cadastrar usuário' }}
        </button>
      </footer>
    </form>
  </dialog>
</template>

<style scoped src="../assets/css/modal-usuario.css"></style>
