<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import BarraNavegacao from '../components/BarraNavegacao.vue'
import { imovelService } from '../services/imovelService'

const imoveis = ref([])
const carregando = ref(false)
const erro = ref('')

async function carregar() {
  carregando.value = true
  erro.value = ''

  try {
    const dados = await imovelService.listar()
    imoveis.value = Array.isArray(dados) ? dados : []
  } catch {
    erro.value =
      'Não foi possível carregar os imóveis. Verifique a conexão e tente novamente.'
  } finally {
    carregando.value = false
  }
}

function formatarNumero(valor, sufixo) {
  if (valor == null) return '—'

  const numero = Number(valor)

  return Number.isFinite(numero)
    ? `${numero.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}${sufixo}`
    : '—'
}

onMounted(carregar)
</script>

<template>
  <BarraNavegacao />

  <main class="pagina">
    <div class="cabecalho">
      <div>
        <h1>Imóveis rurais</h1>
        <p>
          Consulte os imóveis cadastrados e visualize o IAE e os embargos no mapa.
        </p>
      </div>

      <button type="button" :disabled="carregando" @click="carregar">
        Atualizar
      </button>
    </div>

    <p v-if="carregando" role="status">Carregando imóveis…</p>

    <div v-else-if="erro" role="alert">
      <p>{{ erro }}</p>
      <button type="button" @click="carregar">Tentar novamente</button>
    </div>

    <p v-else-if="!imoveis.length">Nenhum imóvel cadastrado.</p>

    <div v-else class="tabela-rolagem">
      <table>
        <thead>
          <tr>
            <th>CAR</th>
            <th>Município</th>
            <th>Área total</th>
            <th>IAE</th>
            <th>Mapa</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="imovel in imoveis" :key="imovel.id">
            <td>{{ imovel.codigoCar || '—' }}</td>
            <td>{{ imovel.municipio || '—' }}</td>
            <td>{{ formatarNumero(imovel.areaTotal, ' ha') }}</td>
            <td>{{ formatarNumero(imovel.iaePercentual, '%') }}</td>
            <td>
              <RouterLink
                v-if="imovel.codigoCar"
                :to="{
                  name: 'Resultado',
                  params: { car: imovel.codigoCar },
                  query: { id: imovel.id },
                }"
              >
                Ver mapa
              </RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</template>

<style scoped>
.pagina {
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px 24px;
  color: #f2f0f7;
}

.cabecalho {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

h1 {
  font-family: 'Chakra Petch', sans-serif;
  margin: 0 0 8px;
}

p {
  color: #aaa5b7;
}

button,
a {
  background: #b400ff;
  border: 0;
  border-radius: 9px;
  color: white;
  padding: 8px 12px;
  cursor: pointer;
  text-decoration: none;
  font: inherit;
}

button:disabled {
  opacity: 0.5;
  cursor: wait;
}

.tabela-rolagem {
  overflow-x: auto;
  border: 1px solid #31243d;
  border-radius: 14px;
}

table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

th,
td {
  padding: 16px;
  border-bottom: 1px solid #25202b;
}

th {
  background: #1a1422;
  color: #cbbbd7;
}

tr:last-child td {
  border-bottom: 0;
}

@media (max-width: 650px) {
  .cabecalho {
    align-items: flex-start;
    flex-direction: column;
  }

  table {
    min-width: 680px;
  }
}
</style>
