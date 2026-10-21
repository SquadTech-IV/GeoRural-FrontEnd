<script setup>
import {
  computed,
  onBeforeUnmount,
  ref,
  watch,
} from 'vue'

import {
  avaliarPublicacao,
  prepararSolicitacaoPublicacao,
} from '../services/fluxoPublicacaoService'

const props = defineProps({
  resultado: {
    type: Object,
    default: null,
  },
  versao: {
    type: Object,
    default: null,
  },
  publicando: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['confirmar'])

const dialogo = ref(null)

const avaliacao = computed(() =>
  avaliarPublicacao({
    resultado: props.resultado,
    versao: props.versao,
    publicando: props.publicando,
  }),
)

function abrirConfirmacao() {
  if (!avaliacao.value.permitido) return

  if (dialogo.value && !dialogo.value.open) {
    dialogo.value.showModal()
  }
}

function fecharConfirmacao() {
  dialogo.value?.close()
}

function cancelar(evento) {
  evento.preventDefault()
  fecharConfirmacao()
}

function confirmar() {
  if (!avaliacao.value.permitido) return

  const solicitacao = prepararSolicitacaoPublicacao({
    resultado: props.resultado,
    versao: props.versao,
    publicando: props.publicando,
  })

  fecharConfirmacao()
  emit('confirmar', solicitacao)
}

watch(
  [
    () => props.versao?.id,
    () => props.resultado?.execucaoId,
    () => props.resultado?.aprovado,
  ],
  fecharConfirmacao,
)

onBeforeUnmount(fecharConfirmacao)
</script>

<template>
  <section class="publicacao-card" aria-labelledby="publicacao-titulo" :aria-busy="publicando">
    <header class="publicacao-cabecalho">
      <div>
        <h2 id="publicacao-titulo">
          Publicação da versão
        </h2>

        <p>
          Confirme os resultados antes de solicitar
          a publicação.
        </p>
      </div>
    </header>

    <dl v-if="versao" class="publicacao-resumo">
      <div>
        <dt>Versão selecionada</dt>
        <dd>{{ versao.numero ?? versao.id }}</dd>
      </div>

      <div>
        <dt>Execução da validação</dt>
        <dd>{{ resultado?.execucaoId ?? 'Não informada' }}</dd>
      </div>
    </dl>

    <div class="publicacao-rodape">
      <p id="publicacao-ajuda">
        {{ avaliacao.motivo }}
      </p>

      <button type="button" class="publicacao-botao publicacao-botao--principal" :disabled="!avaliacao.permitido"
        aria-describedby="publicacao-ajuda" @click="abrirConfirmacao">
        {{
          publicando
            ? 'Publicando...'
            : 'Solicitar publicação'
        }}
      </button>
    </div>

    <p v-if="publicando" class="publicacao-andamento" role="status">
      Aguarde a confirmação do servidor.
    </p>
  </section>

  <Teleport to="body">
    <dialog ref="dialogo" class="publicacao-dialogo" aria-labelledby="publicacao-confirmacao-titulo"
      aria-describedby="publicacao-confirmacao-descricao" @cancel="cancelar">
      <form @submit.prevent="confirmar">
        <header class="publicacao-dialogo-cabecalho">
          <h2 id="publicacao-confirmacao-titulo">
            Confirmar publicação
          </h2>
        </header>

        <div class="publicacao-dialogo-conteudo">
          <p id="publicacao-confirmacao-descricao">
            Deseja solicitar a publicação da versão
            <strong>{{ versao?.numero ?? versao?.id }}</strong>,
            após a conferência da execução
            <strong>{{ resultado?.execucaoId }}</strong>?
          </p>

          <p class="publicacao-dialogo-ajuda">
            O servidor verifica a qualidade da execução
            efetivamente vinculada à versão antes de publicar.
          </p>
        </div>

        <footer class="publicacao-dialogo-rodape">
          <button type="button" class="publicacao-botao" autofocus @click="fecharConfirmacao">
            Cancelar
          </button>

          <button type="submit" class="publicacao-botao publicacao-botao--principal" :disabled="!avaliacao.permitido">
            Confirmar solicitação
          </button>
        </footer>
      </form>
    </dialog>
  </Teleport>
</template>

<style scoped src="../assets/css/fluxo-publicacao-versao.css"></style>
