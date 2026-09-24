<script setup>
import { ref, onMounted } from 'vue'

const emit = defineEmits(['finalizado'])

const etapas = ref([
  { titulo: 'Validando geometrias', subtitulo: 'checando se os polígonos são válidos', status: 'pendente' },
  { titulo: 'Reprojetando para área equivalente', subtitulo: 'projeção adequada para medir hectares', status: 'pendente' },
  { titulo: 'Calculando interseções e áreas', subtitulo: 'Reserva Legal, vegetação e perímetro', status: 'pendente' },
  { titulo: 'Calculando o IRL', subtitulo: 'compara a RL declarada com o mínimo do bioma', status: 'pendente' },
])

async function processar() {
  for (let i = 0; i < etapas.value.length; i++) {
    etapas.value[i].status = 'carregando'
    await new Promise((resolve) => setTimeout(resolve, 900))
    etapas.value[i].status = 'concluido'
  }
   emit('finalizado')
}

onMounted(processar)
</script>

<template>
  <div class="modal-processamento">
    <h2>Processando o imóvel</h2>
    <p class="subtitulo">O núcleo geoespacial está transformando as geometrias em números.</p>

    <ul class="lista-etapas">
      <li v-for="(etapa, i) in etapas" :key="i" class="etapa" :class="{ ativa: etapa.status !== 'pendente' }">
        <span class="icone">
          <span v-if="etapa.status === 'pendente'" class="circulo-vazio"></span>
          <span v-else-if="etapa.status === 'carregando'" class="spinner"></span>
          <span v-else class="check">✓</span>
        </span>
        <div class="texto">
          <p class="etapa-titulo">{{ etapa.titulo }}</p>
          <p class="etapa-subtitulo">{{ etapa.subtitulo }}</p>
        </div>
      </li>
    </ul>
  </div>

    <div v-if="mostrarResultados" class="overlay">
    <ModalProcessamento @finalizado="handleProcessamentoFinalizado" />
  </div>
</template>

<style scoped>
.modal-processamento {
  background: #0A0A0A ;
  border-radius: 16px;
  padding: 32px;
  max-width: 500px;
  margin: 0 auto;
  text-align: center;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
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
  border-bottom: 1px solid #eee;
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

.etapa-titulo {
  margin: 0;
  font-size: 14px;
  color: #fff;
  transition: color 0.2s, font-weight 0.2s;
}

.etapa-subtitulo {
  margin: 2px 0 0;
  font-size: 12px;
  color: #9ca3af;
}
</style>
