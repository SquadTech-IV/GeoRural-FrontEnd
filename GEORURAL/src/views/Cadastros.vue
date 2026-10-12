<script setup>
import { computed, ref } from 'vue'
import BarraNavegacao from '../components/BarraNavegacao.vue'

const props = defineProps({
  fontes: {
    type: Array,
    default: () => [],
  },
  conjuntos: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits([
  'nova-fonte',
  'editar-fonte',
  'detalhar-fonte',
  'alterar-status-fonte',
])

const busca = ref('')

function normalizar(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

const fontesFiltradas = computed(() => {
  const termo = normalizar(busca.value)

  return props.fontes.filter((fonte) =>
    normalizar(`${fonte.nome ?? ''} ${fonte.sigla ?? ''}`)
      .includes(termo),
  )
})

function tiposFornecidos(fonte) {
  return Array.isArray(fonte.oferece) ? fonte.oferece : []
}

function quantidadeCadastrada(fonte) {
  const nomesCadastrados = new Set(
    props.conjuntos
      .filter(
        (conjunto) =>
          String(conjunto.fonteId) === String(fonte.id),
      )
      .map((conjunto) => conjunto.nome),
  )

  return tiposFornecidos(fonte).filter((nome) =>
    nomesCadastrados.has(nome),
  ).length
}

function quantidadePendente(fonte) {
  return tiposFornecidos(fonte).length - quantidadeCadastrada(fonte)
}

function formatarData(valor) {
  const partes = String(valor ?? '')
    .match(/^(\d{4})-(\d{2})-(\d{2})/)

  return partes
    ? `${partes[3]}/${partes[2]}/${partes[1]}`
    : '—'
}
</script>

<template>
  <BarraNavegacao />

  <main class="cadastros-pagina">
    <header class="cadastros-cabecalho">
      <h1>Fontes de dados</h1>

      <p>
        Consulte os órgãos de origem e os conjuntos
        fornecidos para as análises do GeoRural.
      </p>
    </header>

    <section
      class="cadastros-painel"
      aria-labelledby="titulo-listagem-fontes"
    >
      <header class="cadastros-secao">
        <div>
          <h2 id="titulo-listagem-fontes">
            Fontes cadastradas
          </h2>
        </div>

        <button
          type="button"
          class="cadastros-botao cadastros-botao--principal"
          @click="emit('nova-fonte')"
        >
          <span aria-hidden="true">+</span>
          Nova fonte
        </button>
      </header>

      <div class="cadastros-filtros">
        <label class="cadastros-busca">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            aria-hidden="true"
          >
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>

          <input
            v-model="busca"
            type="search"
            aria-label="Buscar fonte pelo nome ou sigla"
            placeholder="Buscar fonte pelo nome ou sigla..."
          />
        </label>
      </div>

      <div class="cadastros-tabela-container">
        <table class="cadastros-tabela">
          <thead>
            <tr>
              <th scope="col">Fonte</th>
              <th scope="col">Sigla</th>
              <th scope="col">Conjuntos</th>
              <th scope="col">Cadastrado em</th>
              <th scope="col">Ações</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="fonte in fontesFiltradas"
              :key="fonte.id"
              :class="{
                'cadastros-linha--inativa': fonte.ativo === false,
              }"
            >
              <td>
                <strong>{{ fonte.nome }}</strong>

                <small v-if="fonte.esfera">
                  {{ fonte.esfera }}
                </small>

                <span
                  v-if="fonte.ativo === false"
                  class="cadastros-chip"
                >
                  Inativa
                </span>
              </td>

              <td>
                <span class="cadastros-chip cadastros-chip--roxo">
                  {{ fonte.sigla }}
                </span>
              </td>

              <td>
                <div class="cadastros-chips">
                  <span class="cadastros-chip cadastros-chip--sucesso">
                    {{ quantidadeCadastrada(fonte) }}
                    {{
                      quantidadeCadastrada(fonte) === 1
                        ? 'cadastrado'
                        : 'cadastrados'
                    }}
                  </span>

                  <span
                    v-if="quantidadePendente(fonte)"
                    class="cadastros-chip cadastros-chip--aviso"
                  >
                    {{ quantidadePendente(fonte) }} a cadastrar
                  </span>
                </div>
              </td>

              <td>
                {{ formatarData(fonte.cadastradoEm) }}
              </td>

              <td>
                <div class="cadastros-acoes">
                  <button
                    type="button"
                    class="cadastros-botao"
                    :aria-label="`Ver detalhes de ${fonte.nome}`"
                    @click="emit('detalhar-fonte', fonte)"
                  >
                    Detalhes
                  </button>

                  <button
                    type="button"
                    class="cadastros-botao"
                    :aria-label="`Editar ${fonte.nome}`"
                    @click="emit('editar-fonte', fonte)"
                  >
                    Editar
                  </button>

                  <button
                    v-if="typeof fonte.ativo === 'boolean'"
                    type="button"
                    class="cadastros-botao"
                    :class="{
                      'cadastros-botao--perigo': fonte.ativo,
                    }"
                    :aria-label="
                      `${fonte.ativo ? 'Desativar' : 'Reativar'} ${fonte.nome}`
                    "
                    @click="emit('alterar-status-fonte', fonte)"
                  >
                    {{ fonte.ativo ? 'Desativar' : 'Reativar' }}
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="!fontesFiltradas.length">
              <td colspan="5" class="cadastros-vazio">
                {{
                  busca.trim()
                    ? 'Nenhuma fonte corresponde à busca.'
                    : 'Nenhuma fonte cadastrada.'
                }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>

<style scoped src="../assets/css/cadastros.css"></style>
