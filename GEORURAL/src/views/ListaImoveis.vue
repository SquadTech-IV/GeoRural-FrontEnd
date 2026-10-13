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
  } catch (erroRequisicao) {
    console.error('Erro ao carregar imóveis:', erroRequisicao)

    erro.value =
      'Não foi possível carregar os imóveis. Verifique a conexão e tente novamente.'
  } finally {
    carregando.value = false
  }
}

function formatarNumero(valor, sufixo = '') {
  if (valor == null) return '—'

  const numero = Number(valor)

  if (!Number.isFinite(numero)) return '—'

  return `${numero.toLocaleString('pt-BR', {
    maximumFractionDigits: 2,
  })}${sufixo}`
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
          Consulte os imóveis cadastrados e visualize o IAE
          e os embargos no mapa.
        </p>
      </div>

      <button
        type="button"
        :disabled="carregando"
        @click="carregar"
      >
        Atualizar
      </button>
    </div>

    <p v-if="carregando" role="status">
      Carregando imóveis…
    </p>

    <div v-else-if="erro" role="alert">
      <p>{{ erro }}</p>

      <button type="button" @click="carregar">
        Tentar novamente
      </button>
    </div>

    <p v-else-if="!imoveis.length">
      Nenhum imóvel cadastrado.
    </p>

    <div v-else class="tabela-rolagem">
      <table class="tabela-imoveis">
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
          <tr
            v-for="imovel in imoveis"
            :key="imovel.id"
          >
            <td>{{ imovel.codigoCar || '—' }}</td>
            <td>{{ imovel.municipio || '—' }}</td>

            <td>
              {{ formatarNumero(imovel.areaTotal, ' ha') }}
            </td>

            <td>
              {{ formatarNumero(imovel.iaePercentual, '%') }}
            </td>

            <td>
              <RouterLink
                v-if="imovel.codigoCar"
                :to="{
                  name: 'Resultado',
                  params: { car: imovel.codigoCar },
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

<style scoped src="../assets/css/imoveis.css"></style>
