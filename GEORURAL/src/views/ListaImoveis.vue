<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import BarraNavegacao from '../components/BarraNavegacao.vue'

import {
  imovelService,
  requisicaoImovelCancelada,
  TAMANHOS_DE_PAGINA,
} from '../services/imovelService'

const imoveis = ref([])
const total = ref(0)
const pagina = ref(0)
const tamanho = ref(100)
const busca = ref('')
const carregando = ref(false)
const erro = ref('')

// detalhe de IAE aberto, por CAR
const carAberto = ref('')
const detalheIae = ref(null)
const carregandoIae = ref(false)
const erroIae = ref('')

let consulta = null

const primeiroDaPagina = computed(() => (total.value === 0 ? 0 : pagina.value * tamanho.value + 1))
const ultimoDaPagina = computed(() => pagina.value * tamanho.value + imoveis.value.length)
const temProxima = computed(() => ultimoDaPagina.value < total.value)
const temAnterior = computed(() => pagina.value > 0)

async function carregar() {
  consulta?.abort()
  const atual = new AbortController()
  consulta = atual

  carregando.value = true
  erro.value = ''

  try {
    // o total vem junto para a tela saber que existe mais do que esta pagina
    const [lista, quantos] = await Promise.all([
      imovelService.listar({
        busca: busca.value,
        pagina: pagina.value,
        tamanho: tamanho.value,
        signal: atual.signal,
      }),
      imovelService.total({ busca: busca.value, signal: atual.signal }),
    ])

    if (consulta !== atual) return

    imoveis.value = lista
    total.value = quantos

    // pagina vazia depois de filtrar: volta para a primeira
    if (!lista.length && pagina.value > 0) {
      pagina.value = 0
      consulta = null
      await carregar()
      return
    }
  } catch (erroRequisicao) {
    if (requisicaoImovelCancelada(erroRequisicao) || consulta !== atual) return

    console.error('Erro ao carregar imóveis:', erroRequisicao)

    erro.value =
      'Não foi possível carregar os imóveis. Verifique a conexão e tente novamente.'
  } finally {
    if (consulta === atual) {
      carregando.value = false
      consulta = null
    }
  }
}

function aplicarBusca() {
  pagina.value = 0
  fecharDetalhe()
  carregar()
}

function mudarTamanho() {
  pagina.value = 0
  carregar()
}

function irPara(novaPagina) {
  pagina.value = Math.max(novaPagina, 0)
  fecharDetalhe()
  carregar()
}

function fecharDetalhe() {
  carAberto.value = ''
  detalheIae.value = null
  erroIae.value = ''
}

// abre o IAE do imovel: percentual, hectares e se ha embargo cruzando a area
async function alternarDetalhe(car) {
  if (!car) return
  if (carAberto.value === car) {
    fecharDetalhe()
    return
  }

  carAberto.value = car
  detalheIae.value = null
  erroIae.value = ''
  carregandoIae.value = true

  try {
    detalheIae.value = await imovelService.detalheIae(car)
  } catch (erroRequisicao) {
    if (!requisicaoImovelCancelada(erroRequisicao)) {
      erroIae.value = 'Não foi possível carregar o IAE deste imóvel.'
    }
  } finally {
    carregandoIae.value = false
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

// 0% de area embargada e o resultado bom; qualquer sobreposicao e problema
function classeIae(valor) {
  if (valor == null) return 'iae-neutro'
  const numero = Number(valor)
  if (!Number.isFinite(numero)) return 'iae-neutro'
  return numero > 0 ? 'iae-ruim' : 'iae-bom'
}

function rotuloIae(valor) {
  if (valor == null) return 'Não calculado'
  return Number(valor) > 0 ? 'Com embargo' : 'Sem embargo'
}

const iaeAberto = computed(() => detalheIae.value?.properties?.iae ?? null)
const temEmbargoNoDetalhe = computed(() => detalheIae.value?.embargos != null)

// US#04: quais embargos atingem o imovel. A lista vem do rin_detalhes, gravada
// no momento do calculo -- antes de o IAE dissolver as geometrias para medir a
// area. Resultado calculado antes dessa mudanca nao tem a lista, e a tela diz
// isso em vez de ficar em branco.
const embargosDoImovel = computed(() => {
  const lista = iaeAberto.value?.detalhes?.embargos
  return Array.isArray(lista) ? lista : []
})

onMounted(carregar)
onBeforeUnmount(() => consulta?.abort())
</script>

<template>
  <BarraNavegacao />

  <main class="pagina">
    <div class="cabecalho">
      <div>
        <h1>Imóveis rurais</h1>

        <p>
          Consulte os imóveis cadastrados, veja a área
          embargada (IAE) e abra os indicadores no mapa.
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

    <form
      class="imoveis-filtros"
      @submit.prevent="aplicarBusca"
    >
      <label>
        <span>Buscar por CAR ou nome</span>

        <input
          v-model="busca"
          type="search"
          placeholder="Ex.: PR-4104808-..."
        />
      </label>

      <label>
        <span>Por página</span>

        <select
          v-model.number="tamanho"
          @change="mudarTamanho"
        >
          <option
            v-for="opcao in TAMANHOS_DE_PAGINA"
            :key="opcao"
            :value="opcao"
          >
            {{ opcao }}
          </option>
        </select>
      </label>

      <button
        type="submit"
        :disabled="carregando"
      >
        Buscar
      </button>
    </form>

    <p
      v-if="carregando"
      role="status"
    >
      Carregando imóveis…
    </p>

    <div
      v-else-if="erro"
      role="alert"
    >
      <p>{{ erro }}</p>

      <button
        type="button"
        @click="carregar"
      >
        Tentar novamente
      </button>
    </div>

    <p v-else-if="!imoveis.length">
      Nenhum imóvel encontrado.
    </p>

    <template v-else>
      <div class="tabela-rolagem">
        <table class="tabela-imoveis">
          <thead>
            <tr>
              <th scope="col">CAR</th>
              <th scope="col">Município</th>
              <th scope="col">Área total</th>
              <th scope="col">Área embargada (IAE)</th>
              <th scope="col">Mapa</th>
            </tr>
          </thead>

          <tbody>
            <template
              v-for="imovel in imoveis"
              :key="imovel.id ?? imovel.codigoCar"
            >
              <tr>
                <td>
                  {{ imovel.codigoCar || '—' }}
                </td>

                <td>
                  {{ imovel.municipio || '—' }}
                </td>

                <td>
                  {{
                    formatarNumero(
                      imovel.areaTotal,
                      ' ha',
                    )
                  }}
                </td>

                <td>
                  <button
                    v-if="imovel.codigoCar"
                    type="button"
                    class="iae-celula"
                    :class="classeIae(imovel.iaePercentual)"
                    :aria-expanded="
                      carAberto === imovel.codigoCar
                    "
                    @click="
                      alternarDetalhe(imovel.codigoCar)
                    "
                  >
                    {{
                      formatarNumero(
                        imovel.iaePercentual,
                        '%',
                      )
                    }}

                    <small>
                      {{ rotuloIae(imovel.iaePercentual) }}
                    </small>
                  </button>

                  <span v-else>—</span>
                </td>

                <td>
                  <RouterLink
                    v-if="imovel.codigoCar"
                    :to="{
                      name: 'MapaIndicadores',
                      params: {
                        car: imovel.codigoCar,
                      },
                    }"
                    :aria-label="
                      `Ver mapa do imóvel ${imovel.codigoCar}`
                    "
                  >
                    Ver mapa
                  </RouterLink>

                  <span v-else>
                    CAR não informado
                  </span>
                </td>
              </tr>

              <tr v-if="carAberto === imovel.codigoCar">
                <td colspan="5">
                  <p v-if="carregandoIae" role="status">
                    Carregando o IAE deste imóvel…
                  </p>

                  <p v-else-if="erroIae" role="alert">
                    {{ erroIae }}
                  </p>

                  <dl v-else-if="iaeAberto" class="iae-detalhe">
                    <div>
                      <dt>Área embargada</dt>

                      <dd>
                        {{
                          formatarNumero(
                            iaeAberto.valorHectares,
                            ' ha',
                          )
                        }}
                      </dd>
                    </div>

                    <div>
                      <dt>Percentual do imóvel</dt>

                      <dd>
                        {{
                          formatarNumero(
                            iaeAberto.valorPercentual,
                            '%',
                          )
                        }}
                      </dd>
                    </div>

                    <div class="iae-detalhe-largo">
                      <dt>Embargos que atingem o imóvel</dt>

                      <dd v-if="embargosDoImovel.length">
                        <ul class="iae-embargos">
                          <li
                            v-for="emb in embargosDoImovel"
                            :key="emb.identificador"
                          >
                            <strong>{{
                              emb.identificador || 'sem identificador'
                            }}</strong>

                            <span>{{ formatarNumero(emb.area_ha, ' ha') }}</span>
                          </li>
                        </ul>
                      </dd>

                      <dd v-else-if="temEmbargoNoDetalhe">
                        Há embargo cruzando o imóvel, mas este cálculo é
                        anterior ao registro dos identificadores. Reprocesse
                        a camada de embargos para ver quais são.
                      </dd>

                      <dd v-else>Nenhum embargo cruza o imóvel</dd>
                    </div>
                  </dl>

                  <p v-else>
                    Este imóvel ainda não teve o IAE
                    calculado.
                  </p>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <nav class="imoveis-paginacao" aria-label="Paginação">
        <p>
          Mostrando
          {{ formatarNumero(primeiroDaPagina) }}–{{
            formatarNumero(ultimoDaPagina)
          }}
          de {{ formatarNumero(total) }}
        </p>

        <div>
          <button
            type="button"
            :disabled="!temAnterior || carregando"
            @click="irPara(pagina - 1)"
          >
            Anterior
          </button>

          <button
            type="button"
            :disabled="!temProxima || carregando"
            @click="irPara(pagina + 1)"
          >
            Próxima
          </button>
        </div>
      </nav>
    </template>
  </main>
</template>

<style scoped src="../assets/css/imoveis.css"></style>

<style scoped>
.imoveis-filtros {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-end;
  margin-bottom: 1rem;
}

.imoveis-filtros label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
}

.iae-celula {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0.3rem 0.5rem;
  border: 1px solid currentColor;
  border-radius: 0.4rem;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  text-align: left;
}

.iae-celula small {
  opacity: 0.75;
  font-size: 0.75rem;
}

.iae-bom {
  color: #1b7f4b;
}

.iae-ruim {
  color: #b3261e;
}

.iae-neutro {
  opacity: 0.7;
}

.iae-detalhe {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin: 0;
}

.iae-detalhe dt {
  font-size: 0.75rem;
  opacity: 0.75;
}

.iae-detalhe dd {
  margin: 0;
  font-weight: 600;
}

.imoveis-paginacao {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  justify-content: space-between;
  margin-top: 1rem;
}

.imoveis-paginacao div {
  display: flex;
  gap: 0.5rem;
}
</style>

<style scoped>
.iae-detalhe-largo {
  grid-column: 1 / -1;
}

.iae-embargos {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.iae-embargos li {
  display: flex;
  gap: 0.6rem;
  justify-content: space-between;
  padding: 0.25rem 0;
  border-bottom: 1px solid currentColor;
  opacity: 0.9;
}

.iae-embargos li:last-child {
  border-bottom: 0;
}
</style>