<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BarraNavegacao from '../components/BarraNavegacao.vue'
import FormularioFonte from '../components/FormularioFonte.vue'
import FormularioConjunto from '../components/FormularioConjunto.vue'
import ToastMensagem from '../components/ToastMensagem.vue'
import ModalConfirmacao from '../components/ModalConfirmacao.vue'
import { normalizarBusca as normalizar, formatarDataCadastro as formatarData, quantidadeConjuntos } from '../services/cadastroService'

import { criarControleCadastros } from '../services/cadastrosControleService'

defineOptions({
  name: 'CadastrosDados',
})

const controle = criarControleCadastros()
const {
  fontes, conjuntos, carregando, carregandoConjuntos,
  erro, erroConjuntos, salvandoFonte, salvandoConjunto,
  erroSalvarFonte, erroSalvarConjunto, alterandoStatus,
  erroAlterarStatus, feedback,
} = controle

onMounted(() => {
  Promise.allSettled([
    controle.carregarFontes(),
    controle.carregarConjuntos(),
  ])
})

onBeforeUnmount(controle.destruir)

const aba = ref('fontes')
const buscaFonte = ref('')
const buscaConjunto = ref('')
const filtroFonte = ref('')

const formularioFonteAberto = ref(false)
const fonteEmEdicao = ref(null)

const formularioConjuntoAberto = ref(false)
const fonteIdNovoConjunto = ref(null)
const conjuntoEmEdicao = ref(null)

const botaoAbaFontes = ref(null)
const botaoAbaConjuntos = ref(null)

const notificacao = ref(null)
const desativacaoPendente = ref(null)
const confirmacaoEnviada = ref(false)

let sequenciaNotificacao = 0

const salvando = computed(
  () =>
    salvandoFonte.value ||
    salvandoConjunto.value ||
    alterandoStatus.value ||
    confirmacaoEnviada.value,
)

const modalAberto = computed(
  () =>
    formularioFonteAberto.value ||
    formularioConjuntoAberto.value ||
    desativacaoPendente.value !== null,
)

const processandoDesativacao = computed(
  () => alterandoStatus.value || confirmacaoEnviada.value,
)

const mensagemDesativacao = computed(() => {
  const pendente = desativacaoPendente.value

  if (!pendente) return ''

  return pendente.tipo === 'fonte'
    ? `Deseja desativar a fonte “${pendente.registro.nome}”?`
    : `Deseja desativar o conjunto “${pendente.registro.nome}”?`
})

const avisoDesativacao = computed(() => {
  if (desativacaoPendente.value?.tipo === 'fonte') {
    return (
      'Os conjuntos vinculados ficam indisponíveis enquanto ' +
      'a fonte estiver inativa. Os cadastros serão preservados.'
    )
  }

  return (
    'O conjunto ficará inativo. Seu cadastro será preservado ' +
    'e poderá ser reativado posteriormente.'
  )
})

function notificar(mensagem, tipo = 'sucesso') {
  if (typeof mensagem !== 'string' || !mensagem.trim()) return

  const tipoValido = ['sucesso', 'erro', 'aviso'].includes(tipo)
    ? tipo
    : 'aviso'

  notificacao.value = {
    id: ++sequenciaNotificacao,
    mensagem: mensagem.trim(),
    tipo: tipoValido,
    duracao: tipoValido === 'sucesso' ? 5000 : 0,
  }
}

function fecharNotificacao() {
  notificacao.value = null
}

watch(
  () => feedback.value,
  (feedback) => {
    if (!feedback) return

    notificar(feedback.mensagem, feedback.tipo)
  },
  { immediate: true },
)

watch(
  () => erroAlterarStatus.value,
  (erro) => {
    if (erro) {
      liberarTentativaDesativacao()
    }
  },
)

watch(
  () => alterandoStatus.value,
  (atual, anterior) => {
    if (anterior && !atual && erroAlterarStatus.value) {
      liberarTentativaDesativacao()
    }
  },
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

const fontesFiltradas = computed(() => {
  const termo = normalizar(buscaFonte.value)

  return fontes.value.filter((fonte) =>
    normalizar(`${fonte.nome ?? ''} ${fonte.sigla ?? ''}`)
      .includes(termo),
  )
})

const conjuntosFiltrados = computed(() => {
  const termo = normalizar(buscaConjunto.value)

  return conjuntos.value.filter((conjunto) => {
    const correspondeBusca = normalizar(conjunto.nome).includes(termo)

    const correspondeFonte =
      filtroFonte.value === '' ||
      String(conjunto.fonteId) === String(filtroFonte.value)

    return correspondeBusca && correspondeFonte
  })
})

function obterFonte(id) {
  return fontes.value.find(
    (fonte) => String(fonte.id) === String(id),
  )
}

function quantidadeCadastrada(fonte) {
  return quantidadeConjuntos(fonte, conjuntos.value)
}

function abrirFormularioFonte() {
  if (carregando.value || salvando.value || modalAberto.value) {
    return
  }

  fonteEmEdicao.value = null
  formularioFonteAberto.value = true

  controle.limparErroFonte()
}

function editarFonte(fonte) {
  if (salvando.value || modalAberto.value) return

  fonteEmEdicao.value = fonte
  formularioFonteAberto.value = true

  controle.limparErroFonte()
}

function fecharFormularioFonte() {
  if (salvandoFonte.value) return

  formularioFonteAberto.value = false
  fonteEmEdicao.value = null
}

async function solicitarCadastroFonte(dados) {
  if (salvando.value) return

  if (await controle.salvarFonte(dados)) fecharFormularioFonte()
}

function abrirFormularioConjunto(fonte = null) {
  if (
    carregando.value ||
    carregandoConjuntos.value ||
    salvando.value ||
    modalAberto.value
  ) {
    return
  }

  conjuntoEmEdicao.value = null
  fonteIdNovoConjunto.value = fonte?.id ?? null
  formularioConjuntoAberto.value = true
  controle.limparErroConjunto()
}

function editarConjunto(conjunto) {
  if (salvando.value || modalAberto.value) return

  conjuntoEmEdicao.value = conjunto
  fonteIdNovoConjunto.value = conjunto.fonteId
  formularioConjuntoAberto.value = true

  controle.limparErroConjunto()
}

function fecharFormularioConjunto() {
  if (salvandoConjunto.value) return

  formularioConjuntoAberto.value = false
  fonteIdNovoConjunto.value = null
  conjuntoEmEdicao.value = null
}

async function solicitarCadastroConjunto(dados) {
  if (salvando.value) return

  if (await controle.salvarConjunto(dados)) fecharFormularioConjunto()
}

function solicitarAlteracaoStatusFonte(fonte) {
  if (salvando.value || modalAberto.value) return

  if (fonte.ativo === false) {
    controle.alterarStatusFonte(fonte)
    return
  }

  if (fonte.ativo !== true) return

  erroAlterarStatus.value = ''
  confirmacaoEnviada.value = false
  desativacaoPendente.value = {
    tipo: 'fonte',
    registro: fonte,
  }
}

function solicitarAlteracaoStatusConjunto(conjunto) {
  if (salvando.value || modalAberto.value) return

  if (conjunto.ativo === false) {
    controle.alterarStatusConjunto(conjunto)
    return
  }

  if (conjunto.ativo !== true) return

  erroAlterarStatus.value = ''
  confirmacaoEnviada.value = false
  desativacaoPendente.value = {
    tipo: 'conjunto',
    registro: conjunto,
  }
}

function cancelarDesativacao() {
  if (processandoDesativacao.value) return

  desativacaoPendente.value = null
}

async function confirmarDesativacao() {
  if (
    !desativacaoPendente.value ||
    processandoDesativacao.value
  ) {
    return
  }

  confirmacaoEnviada.value = true

  const { tipo, registro } = desativacaoPendente.value

  const sucesso = tipo === 'fonte'
    ? await controle.alterarStatusFonte(registro)
    : await controle.alterarStatusConjunto(registro)

  if (sucesso) finalizarDesativacao()
  else liberarTentativaDesativacao()
}

function finalizarDesativacao() {
  confirmacaoEnviada.value = false
  desativacaoPendente.value = null
}

function liberarTentativaDesativacao() {
  confirmacaoEnviada.value = false
}

function limparFiltrosConjuntos() {
  buscaConjunto.value = ''
  filtroFonte.value = ''
}

defineExpose({
  fecharFormularioFonte,
  fecharFormularioConjunto,
  notificar,
  finalizarDesativacao,
  liberarTentativaDesativacao,
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
        <span>{{ fontes.length }}</span>
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
        <span>{{ conjuntos.length }}</span>
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
            vinculados a cada fonte.
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
            @click="controle.carregarFontes()"
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
                        @click="solicitarAlteracaoStatusFonte(fonte)"
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
            consulte seus metadados de origem.
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
            @click="controle.carregarConjuntos()"
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
                  <th scope="col">Tipo de camada</th>
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
                    {{ conjunto.tipoCamada }}
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
                        :disabled="salvando || obterFonte(conjunto.fonteId)?.ativo !== true"
                        :aria-label="`Editar ${conjunto.nome}`"
                        @click="editarConjunto(conjunto)"
                      >
                        Editar
                      </button>

                      <button
                        v-if="typeof conjunto.ativo === 'boolean'"
                        type="button"
                        class="cadastros-botao"
                        :disabled="salvando || obterFonte(conjunto.fonteId)?.ativo !== true"
                        :class="{
                          'cadastros-botao--perigo': conjunto.ativo,
                        }"
                        :aria-label="
                          `${conjunto.ativo ? 'Desativar' : 'Reativar'} ${conjunto.nome}`
                        "
                        @click="solicitarAlteracaoStatusConjunto(conjunto)"
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
    :conjunto="conjuntoEmEdicao"
    :fontes="fontes"
    :conjuntos="conjuntos"
    :fonte-id="fonteIdNovoConjunto"
    :salvando="salvandoConjunto"
    :erro="erroSalvarConjunto"
    @fechar="fecharFormularioConjunto"
    @salvar="solicitarCadastroConjunto"
  />

  <ModalConfirmacao
    v-if="desativacaoPendente"
    :titulo="
      desativacaoPendente.tipo === 'fonte'
        ? 'Desativar fonte'
        : 'Desativar conjunto'
    "
    :mensagem="mensagemDesativacao"
    :aviso="avisoDesativacao"
    :processando="processandoDesativacao"
    :erro="erroAlterarStatus"
    @cancelar="cancelarDesativacao"
    @confirmar="confirmarDesativacao"
  />

  <ToastMensagem
    v-if="notificacao"
    :key="notificacao.id"
    :mensagem="notificacao.mensagem"
    :tipo="notificacao.tipo"
    :duracao="notificacao.duracao"
    @fechar="fecharNotificacao"
  />
</template>

<style scoped src="../assets/css/cadastros.css"></style>
