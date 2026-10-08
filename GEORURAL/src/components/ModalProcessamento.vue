<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  concluido: { type: Boolean, default: false },
  erro: { type: String, default: null },
})

const emit = defineEmits(['finalizado', 'fechar'])

const etapas = ref([
  {
    titulo: 'Validando os dados geográficos',
    subtitulo: 'Verificando a geometria do imóvel e dos embargos',
    status: 'pendente',
  },
  {
    titulo: 'Preparando as áreas para o cálculo',
    subtitulo: 'Reprojetando as geometrias para medir as áreas em hectares',
    status: 'pendente',
  },
  {
    titulo: 'Identificando áreas embargadas',
    subtitulo: 'Calculando a sobreposição dos embargos com o imóvel',
    status: 'pendente',
  },
  {
    titulo: 'Calculando o IAE',
    subtitulo: 'Relacionando a área embargada com a área total do imóvel',
    status: 'pendente',
  },
])

let ativo = true

// resolve quando o pai avisa que o upload terminou ou falhou
let resolverDesfecho
const desfecho = new Promise((resolve) => {
  resolverDesfecho = resolve
})

watch(
  () => [props.concluido, props.erro],
  ([concluido, erro]) => {
    if (concluido || erro) resolverDesfecho()
  },
  { immediate: true },
)

function aguardar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function animarEtapas() {
  const ultima = etapas.value.length - 1

  for (let i = 0; i <= ultima; i++) {
    if (!ativo || props.erro) return

    const etapa = etapas.value[i]
    etapa.status = 'carregando'

    if (i < ultima) {
      await aguardar(900)
    } else {
      // a última etapa espera o backend responder
      await desfecho
    }

    if (!ativo) return

    if (props.erro) {
      etapa.status = 'falha'
      return
    }

    etapa.status = 'concluido'
  }

  emit('finalizado')
}

onMounted(animarEtapas)

onUnmounted(() => {
  ativo = false
})
</script>

<template>
  <div class="modal-processamento" role="dialog" aria-modal="true">
    <h2>Processando o imóvel</h2>

    <p class="subtitulo">
      O núcleo geoespacial está transformando as geometrias em números.
    </p>

    <ul class="lista-etapas">
      <li
        v-for="(etapa, i) in etapas"
        :key="i"
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

          <span v-else-if="etapa.status === 'falha'" class="falha">✕</span>

          <span v-else class="check">✓</span>
        </span>

        <div class="texto">
          <p class="etapa-titulo">{{ etapa.titulo }}</p>
          <p class="etapa-subtitulo">{{ etapa.subtitulo }}</p>
        </div>
      </li>
    </ul>

    <div v-if="erro" class="bloco-erro">
      <p class="erro">{{ erro }}</p>
      <button type="button" class="btn-fechar" @click="emit('fechar')">
        Fechar
      </button>
    </div>
  </div>
</template>

<style scoped>
.modal-processamento {
  background: #0a0a0a;
  border: 1px solid #b829f7;
  border-radius: 16px;
  padding: 32px;
  width: min(500px, calc(100vw - 32px));
  margin: 0 auto;
  text-align: center;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
  font-family: 'Chakra Petch', sans-serif;
}

h2 {
  color: #fff;
  font-size: 20px;
  margin: 0 0 8px;
}

.subtitulo {
  color: #fff;
  font-size: 14px;
  margin: 0 0 24px;
}

.lista-etapas {
  list-style: none;
  margin: 0;
  padding: 0;
  text-align: left;
}

.etapa {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid #333;
}

.etapa:last-child {
  border-bottom: none;
}

.icone {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.circulo-vazio {
  width: 20px;
  height: 20px;
  border: 2px solid #d1d5db;
  border-radius: 50%;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #d1fae5;
  border-top: 2px solid #b829f7;
  border-radius: 50%;
  animation: girar 0.7s linear infinite;
}

@keyframes girar {
  to {
    transform: rotate(360deg);
  }
}

.check {
  width: 22px;
  height: 22px;
  background: #b829f7;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.falha {
  width: 22px;
  height: 22px;
  background: #f87171;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.etapa-titulo {
  margin: 0;
  font-size: 14px;
  color: #fff;
}

.etapa-subtitulo {
  margin: 2px 0 0;
  font-size: 12px;
  color: #9ca3af;
}

.bloco-erro {
  margin-top: 16px;
}

.erro {
  color: #f87171;
  font-size: 13px;
  margin: 0 0 12px;
}

.btn-fechar {
  background: transparent;
  color: #fff;
  border: 1px solid #b829f7;
  border-radius: 8px;
  padding: 8px 20px;
  cursor: pointer;
  font-family: inherit;
}
</style>
