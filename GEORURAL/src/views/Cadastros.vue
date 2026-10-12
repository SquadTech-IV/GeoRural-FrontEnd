<script setup>
import { computed, ref } from 'vue'
import BarraNavegacao from '../components/BarraNavegacao.vue'
import FormularioFonte from '../components/FormularioFonte.vue'
import FormularioConjunto from '../components/FormularioConjunto.vue'

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
  carregandoConjuntos: {
    type: Boolean,
    default: false,
  },
  erroConjuntos: {
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
  salvandoConjunto: {
    type: Boolean,
    default: false,
  },
  erroSalvarConjunto: {
    type: String,
    default: '',
  },
})

const emit = defineEmits([
  'nova-fonte',
  'editar-fonte',
  'alterar-status-fonte',
  'tentar-novamente',
  'salvar-fonte',
  'salvar-conjunto',
  'editar-conjunto',
  'alterar-status-conjunto',
  'tentar-novamente-conjuntos',
])

const aba = ref('fontes')
const buscaFonte = ref('')
const buscaConjunto = ref('')
const filtroFonte = ref('')

const formularioFonteAberto = ref(false)
const fonteEmEdicao = ref(null)

const formularioConjuntoAberto = ref(false)
const fonteIdNovoConjunto = ref(null)

const botaoAbaFontes = ref(null)
const botaoAbaConjuntos = ref(null)

const salvando = computed(
  () => props.salvandoFonte || props.salvandoConjunto,
)

const modalAberto = computed(
  () =>
    formularioFonteAberto.value ||
    formularioConjuntoAberto.value,
)

function selecionarAba(nome) {
  aba.value = nome
}

function navegarAbas(evento) {
  if (
    !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(evento.key)
  ) {
    return
  }

  evento.preventDefault()

  if (evento.key === 'Home') {
    aba.value = 'fontes'
  } else if (evento.key === 'End') {
    aba.value = 'conjuntos'
  } else {
    aba.value = aba.value === 'fontes' ? 'conjuntos' : 'fontes'
  }

  if (aba.value === 'fontes') {
    botaoAbaFontes.value?.focus()
  } else {
    botaoAbaConjuntos.value?.focus()
  }
}

function normalizar(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

const fontesFiltradas = computed(() => {
  const termo = normalizar(buscaFonte.value)

  return props.fontes.filter((fonte) =>
    normalizar(`${fonte.nome ?? ''} ${fonte.sigla ?? ''}`)
      .includes(termo),
  )
})

const conjuntosFiltrados = computed(() => {
  const termo = normalizar(buscaConjunto.value)

  return props.conjuntos.filter((conjunto) => {
    const correspondeBusca = normalizar(conjunto.nome).includes(termo)

    const correspondeFonte =
      filtroFonte.value === '' ||
      String(conjunto.fonteId) === String(filtroFonte.value)

    return correspondeBusca && correspondeFonte
  })
})

function obterFonte(id) {
  return props.fontes.find(
    (fonte) => String(fonte.id) === String(id),
  )
}

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

function abrirFormularioFonte() {
  if (props.carregando || salvando.value || modalAberto.value) {
    return
  }

  fonteEmEdicao.value = null
  formularioFonteAberto.value = true
  emit('nova-fonte')
}

function editarFonte(fonte) {
  if (salvando.value || modalAberto.value) return

  fonteEmEdicao.value = fonte
  formularioFonteAberto.value = true
  emit('editar-fonte', fonte)
}

function fecharFormularioFonte() {
  if (props.salvandoFonte) return

  formularioFonteAberto.value = false
  fonteEmEdicao.value = null
}

function solicitarCadastroFonte(dados) {
  if (salvando.value) return

  emit('salvar-fonte', dados)
}

function abrirFormularioConjunto(fonte = null) {
  if (
    props.carregando ||
    props.carregandoConjuntos ||
    salvando.value ||
    modalAberto.value
  ) {
    return
  }

  fonteIdNovoConjunto.value = fonte?.id ?? null
  formularioConjuntoAberto.value = true
}

function fecharFormularioConjunto() {
  if (props.salvandoConjunto) return

  formularioConjuntoAberto.value = false
  fonteIdNovoConjunto.value = null
}

function solicitarCadastroConjunto(dados) {
  if (salvando.value) return

  emit('salvar-conjunto', dados)
}

function limparFiltrosConjuntos() {
  buscaConjunto.value = ''
  filtroFonte.value = ''
}

defineExpose({
  fecharFormularioFonte,
  fecharFormularioConjunto,
})
</script>

<template>
  <BarraNavegacao />

  <main class="cadastros-pagina">
    <div
      class="cadastros-abas-linha"
      role="tablist"
      aria-label="Cadastros de dados"
      @keydown="navegarAbas"
    >
      <button
        id="aba-fontes"
        ref="botaoAbaFontes"
        type="button"
        role="tab"
        aria-controls="painel-fontes"
        :aria-selected="aba === 'fontes'"
        :tabindex="aba === 'fontes' ? 0 : -1"
        :class="{ 'cadastros-aba--ativa': aba === 'fontes' }"
        @click="selecionarAba('fontes')"
      >
        Fontes
      </button>

      <button
        id="aba-conjuntos"
        ref="botaoAbaConjuntos"
        type="button"
        role="tab"
        aria-controls="painel-conjuntos"
        :aria-selected="aba === 'conjuntos'"
        :tabindex="aba === 'conjuntos' ? 0 : -1"
        :class="{ 'cadastros-aba--ativa': aba === 'conjuntos' }"
        @click="selecionarAba('conjuntos')"
      >
        Conjuntos de dados
      </button>
    </div>

    <section
      id="painel-fontes"
      v-show="aba === 'fontes'"
      role="tabpanel"
      aria-labelledby="aba-fontes"
      :aria-busy="carregando"
    >
      <header class="cadastros-cabecalho cadastros-secao">
        <div>
          <h1>Fontes de dados</h1>

          <p>
            Cadastre os órgãos de origem e os conjuntos
            que cada fonte fornece.
          </p>
        </div>

        <button
          type="button"
          class="cadastros-botao cadastros-botao--principal"
          :disabled="carregando || salvando"
          @click="abrirFormularioFonte"
        >
          <span aria-hidden="true">+</span>
          Nova fonte
        </button>
      </header>

      <div class="cadastros-painel">
        <div
          v-if="carregando"
          class="cadastros-estado"
          role="status"
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
          <h3>Não foi possível carregar as fontes</h3>
          <p>{{ erro }}</p>

          <button
            type="button"
            class="cadastros-botao cadastros-botao--principal"
            :disabled="salvando"
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
                v-model="buscaFonte"
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
              “{{ buscaFonte.trim() }}”.
            </p>

            <button
              type="button"
              class="cadastros-botao"
              @click="buscaFonte = ''"
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
                        :disabled="salvando"
                        :aria-label="`Editar ${fonte.nome}`"
                        @click="editarFonte(fonte)"
                      >
                        Editar
                      </button>

                      <button
                        v-if="typeof fonte.ativo === 'boolean'"
                        type="button"
                        class="cadastros-botao"
                        :disabled="salvando"
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
      </div>
    </section>

    <section
      id="painel-conjuntos"
      v-show="aba === 'conjuntos'"
      role="tabpanel"
      aria-labelledby="aba-conjuntos"
      :aria-busy="carregandoConjuntos"
    >
      <header class="cadastros-cabecalho cadastros-secao">
        <div>
          <h1>Conjuntos de dados</h1>

          <p>
            Consulte os conjuntos de cada fonte e
            configure como os dados serão recebidos.
          </p>
        </div>

        <button
          type="button"
          class="cadastros-botao cadastros-botao--principal"
          :disabled="carregando || carregandoConjuntos || salvando"
          @click="abrirFormularioConjunto()"
        >
          <span aria-hidden="true">+</span>
          Novo conjunto
        </button>
      </header>

      <div class="cadastros-painel">
        <div
          v-if="carregandoConjuntos"
          class="cadastros-estado"
          role="status"
        >
          <span
            class="cadastros-spinner"
            aria-hidden="true"
          ></span>

          <h3>Carregando conjuntos</h3>
          <p>Aguarde enquanto os dados são consultados.</p>
        </div>

        <div
          v-else-if="erroConjuntos"
          class="cadastros-estado cadastros-estado--erro"
          role="alert"
        >
          <h3>Não foi possível carregar os conjuntos</h3>
          <p>{{ erroConjuntos }}</p>

          <button
            type="button"
            class="cadastros-botao cadastros-botao--principal"
            :disabled="salvando"
            @click="emit('tentar-novamente-conjuntos')"
          >
            Tentar novamente
          </button>
        </div>

        <div
          v-else-if="!conjuntos.length"
          class="cadastros-estado"
          role="status"
        >
          <h3>Nenhum conjunto cadastrado</h3>

          <p>
            Clique em “Novo conjunto” para vincular
            um conjunto a uma fonte.
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
                v-model="buscaConjunto"
                type="search"
                aria-label="Buscar conjunto"
                placeholder="Buscar conjunto..."
              />
            </label>

            <select
              v-model="filtroFonte"
              class="cadastros-select"
              aria-label="Filtrar conjuntos por fonte"
            >
              <option value="">Todas as fontes</option>

              <option
                v-for="fonte in fontes"
                :key="fonte.id"
                :value="fonte.id"
              >
                {{ fonte.sigla }}
              </option>
            </select>
          </div>

          <div
            v-if="!conjuntosFiltrados.length"
            class="cadastros-estado"
            role="status"
          >
            <h3>Nenhum conjunto encontrado</h3>
            <p>Nenhum conjunto corresponde aos filtros.</p>

            <button
              type="button"
              class="cadastros-botao"
              @click="limparFiltrosConjuntos"
            >
              Limpar filtros
            </button>
          </div>

          <div v-else class="cadastros-tabela-container">
            <table class="cadastros-tabela">
              <thead>
                <tr>
                  <th scope="col">Conjunto</th>
                  <th scope="col">Fonte</th>
                  <th scope="col">Entrada</th>
                  <th scope="col">SRS</th>
                  <th scope="col">Cadastrado em</th>
                  <th scope="col">Ações</th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="conjunto in conjuntosFiltrados"
                  :key="conjunto.id"
                  :class="{
                    'cadastros-linha--inativa':
                      conjunto.ativo === false ||
                      obterFonte(conjunto.fonteId)?.ativo === false,
                  }"
                >
                  <td>
                    <strong>{{ conjunto.nome }}</strong>

                    <small>
                      {{ conjunto.cobertura || '—' }} ·
                      {{ conjunto.periodicidade || '—' }}
                    </small>

                    <span
                      v-if="conjunto.ativo === false"
                      class="cadastros-chip"
                    >
                      Inativo
                    </span>

                    <span
                      v-if="obterFonte(conjunto.fonteId)?.ativo === false"
                      class="cadastros-chip cadastros-chip--aviso"
                    >
                      Fonte inativa
                    </span>
                  </td>

                  <td>
                    <span
                      class="cadastros-chip cadastros-chip--roxo"
                    >
                      {{ obterFonte(conjunto.fonteId)?.sigla || '—' }}
                    </span>
                  </td>

                  <td>
                    <div class="cadastros-chips">
                      <span
                        v-if="conjunto.upload"
                        class="cadastros-chip"
                      >
                        Upload
                      </span>

                      <span
                        v-if="conjunto.api"
                        class="cadastros-chip cadastros-chip--roxo"
                      >
                        API
                      </span>

                      <span v-if="!conjunto.upload && !conjunto.api">
                        —
                      </span>
                    </div>
                  </td>

                  <td class="cadastros-mono">
                    {{ conjunto.srs || '—' }}
                  </td>

                  <td>
                    {{ formatarData(conjunto.cadastradoEm) }}
                  </td>

                  <td>
                    <div class="cadastros-acoes">
                      <button
                        type="button"
                        class="cadastros-botao"
                        :disabled="salvando"
                        :aria-label="`Editar ${conjunto.nome}`"
                        @click="emit('editar-conjunto', conjunto)"
                      >
                        Editar
                      </button>

                      <button
                        v-if="typeof conjunto.ativo === 'boolean'"
                        type="button"
                        class="cadastros-botao"
                        :disabled="salvando"
                        :class="{
                          'cadastros-botao--perigo': conjunto.ativo,
                        }"
                        :aria-label="
                          `${conjunto.ativo ? 'Desativar' : 'Reativar'} ${conjunto.nome}`
                        "
                        @click="emit('alterar-status-conjunto', conjunto)"
                      >
                        {{ conjunto.ativo ? 'Desativar' : 'Reativar' }}
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>
    </section>
  </main>

  <FormularioFonte
    v-if="formularioFonteAberto"
    :fonte="fonteEmEdicao"
    :fontes="fontes"
    :conjuntos="conjuntos"
    :salvando="salvandoFonte"
    :erro="erroSalvarFonte"
    @fechar="fecharFormularioFonte"
    @salvar="solicitarCadastroFonte"
  />

<FormularioConjunto
  v-if="formularioConjuntoAberto"
  :fontes="fontes"
  :conjuntos="conjuntos"
  :fonte-id="fonteIdNovoConjunto"
  :salvando="salvandoConjunto"
  :erro="erroSalvarConjunto"
  @fechar="fecharFormularioConjunto"
  @salvar="solicitarCadastroConjunto"
/>
</template>

<style scoped src="../assets/css/cadastros.css"></style>
