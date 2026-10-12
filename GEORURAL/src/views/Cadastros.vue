<script setup>
import { computed, ref } from 'vue'
import BarraNavegacao from '../components/BarraNavegacao.vue'
import FormularioFonte from '../components/FormularioFonte.vue'

const props = defineProps({
  fontes: {
    type: Array,
    default: () => [],
  },
  conjuntos: {
    type: Array,
    default: () => [],
  },
  carregando: {
    type: Boolean,
    default: false,
  },
  erro: {
    type: String,
    default: '',
  },
  salvandoFonte: {
    type: Boolean,
    default: false,
  },
  erroSalvarFonte: {
    type: String,
    default: '',
  },
})

const emit = defineEmits([
  'nova-fonte',
  'editar-fonte',
  'detalhar-fonte',
  'alterar-status-fonte',
  'tentar-novamente',
  'salvar-fonte',
])

const busca = ref('')
const formularioFonteAberto = ref(false)

function abrirFormularioFonte() {
  formularioFonteAberto.value = true
  emit('nova-fonte')
}

function fecharFormularioFonte() {
  if (props.salvandoFonte) return

  formularioFonteAberto.value = false
}

function solicitarCadastroFonte(dados) {
  if (props.salvandoFonte) return

  emit('salvar-fonte', dados)
}

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

defineExpose({
  fecharFormularioFonte,
})
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
      :aria-busy="carregando"
    >
      <header class="cadastros-secao">
        <div>
          <h2 id="titulo-listagem-fontes">
            Fontes cadastradas
          </h2>

          <p v-if="!carregando && !erro">
            {{ fontes.length }}
            {{
              fontes.length === 1
                ? 'fonte cadastrada'
                : 'fontes cadastradas'
            }}
          </p>
        </div>

        <button
          type="button"
          class="cadastros-botao cadastros-botao--principal"
          :disabled="carregando || salvandoFonte"
          @click="abrirFormularioFonte"
        >
          <span aria-hidden="true">+</span>
          Nova fonte
        </button>
      </header>

      <div
        v-if="carregando"
        class="cadastros-estado"
        role="status"
        aria-live="polite"
      >
        <span
          class="cadastros-spinner"
          aria-hidden="true"
        ></span>

        <h3>Carregando fontes</h3>

        <p>Aguarde enquanto os dados são consultados.</p>
      </div>

      <div
        v-else-if="erro"
        class="cadastros-estado cadastros-estado--erro"
        role="alert"
      >
        <svg
          class="cadastros-estado-icone"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6" />
          <path d="M12 17h.01" />
        </svg>

        <h3>Não foi possível carregar as fontes</h3>

        <p>{{ erro }}</p>

        <button
          type="button"
          class="cadastros-botao cadastros-botao--principal"
          @click="emit('tentar-novamente')"
        >
          Tentar novamente
        </button>
      </div>

      <div
        v-else-if="!fontes.length"
        class="cadastros-estado"
        role="status"
      >
        <svg
          class="cadastros-estado-icone"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <ellipse cx="12" cy="5" rx="8" ry="3" />
          <path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
          <path d="M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" />
        </svg>

        <h3>Nenhuma fonte cadastrada</h3>

        <p>
          Clique em “Nova fonte” para cadastrar
          o primeiro órgão de origem.
        </p>
      </div>

      <template v-else>
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

        <div
          v-if="!fontesFiltradas.length"
          class="cadastros-estado"
          role="status"
        >
          <h3>Nenhuma fonte encontrada</h3>

          <p>
            Nenhuma fonte corresponde à busca
            “{{ busca.trim() }}”.
          </p>

          <button
            type="button"
            class="cadastros-botao"
            @click="busca = ''"
          >
            Limpar busca
          </button>
        </div>

        <div v-else class="cadastros-tabela-container">
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
                  'cadastros-linha--inativa':
                    fonte.ativo === false,
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
                  <span
                    class="cadastros-chip cadastros-chip--roxo"
                  >
                    {{ fonte.sigla }}
                  </span>
                </td>

                <td>
                  <div class="cadastros-chips">
                    <span
                      class="cadastros-chip cadastros-chip--sucesso"
                    >
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
            </tbody>
          </table>
        </div>
      </template>
    </section>
  </main>

  <FormularioFonte
  v-if="formularioFonteAberto"
  :fontes="fontes"
  :salvando="salvandoFonte"
  :erro="erroSalvarFonte"
  @fechar="fecharFormularioFonte"
  @salvar="solicitarCadastroFonte"

  />
</template>

<style scoped src="../assets/css/cadastros.css"></style>
