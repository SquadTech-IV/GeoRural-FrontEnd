<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  concluido: {
    type: Boolean,
    default: false,
  },
  erro: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['finalizado', 'fechar'])

const etapas = ref([
  {
    titulo: 'Validando geometrias',
    subtitulo: 'Verificando as geometrias do imóvel e dos embargos',
    status: 'pendente',
  },
  {
    titulo: 'Preparando as geometrias',
    subtitulo: 'Organizando os dados para a análise espacial',
    status: 'pendente',
  },
  {
    titulo: 'Analisando sobreposições',
    subtitulo: 'Identificando a área do imóvel que coincide com embargos',
    status: 'pendente',
  },
  {
    titulo: 'Aguardando o resultado',
    subtitulo: 'Aguardando a conclusão do processamento no servidor',
    status: 'pendente',
  },
])

let ativo = true
let resolverDesfecho

const desfecho = new Promise((resolve) => {
  resolverDesfecho = resolve
})

watch(
  () => [props.concluido, props.erro],
  ([concluido, erro]) => {
    if (concluido || erro) {
      resolverDesfecho()
    }
  },
  { immediate: true },
)

function aguardar(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function animarEtapas() {
  const ultima = etapas.value.length - 1

  for (let i = 0; i <= ultima; i++) {
    if (!ativo) return

    const etapa = etapas.value[i]

    if (props.erro) {
      etapa.status = 'falha'
      return
    }

    etapa.status = 'carregando'

    if (i < ultima) {
      await aguardar(900)
    } else {
      await desfecho
    }

    if (!ativo) return

    if (props.erro) {
      etapa.status = 'falha'
      return
    }

    etapa.status = 'concluido'
  }

  if (ativo && props.concluido && !props.erro) {
    emit('finalizado')
  }
}

onMounted(animarEtapas)

onUnmounted(() => {
  ativo = false
  resolverDesfecho()
})
</script>

<template>
  <div
    class="modal-processamento"
    role="dialog"
    aria-modal="true"
    aria-labelledby="titulo-processamento"
  >
    <h2 id="titulo-processamento">
      Processando o imóvel
    </h2>

    <p class="subtitulo">
      Aguarde enquanto o servidor processa os dados geoespaciais.
    </p>

    <ul class="lista-etapas">
      <li
        v-for="(etapa, index) in etapas"
        :key="index"
        class="etapa"
        :class="{ ativa: etapa.status !== 'pendente' }"
      >
        <span class="icone">
          <span
            v-if="etapa.status === 'pendente'"
            class="circulo-vazio"
          ></span>

          <span
            v-else-if="etapa.status === 'carregando'"
            class="spinner"
          ></span>

          <span
            v-else-if="etapa.status === 'falha'"
            class="falha"
          >
            ✕
          </span>

          <span v-else class="check">
            ✓
          </span>
        </span>

        <div class="texto">
          <p class="etapa-titulo">
            {{ etapa.titulo }}
          </p>

          <p class="etapa-subtitulo">
            {{ etapa.subtitulo }}
          </p>
        </div>
      </li>
    </ul>

    <div v-if="erro" class="bloco-erro">
      <p class="erro" role="alert">
        {{ erro }}
      </p>

      <button
        type="button"
        class="btn-fechar"
        @click="emit('fechar')"
      >
        Fechar
      </button>
    </div>
  </div>
</template>

<style scoped src="../assets/css/modal-processamento.css"></style>
