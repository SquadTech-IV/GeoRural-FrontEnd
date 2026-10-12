<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'

const props = defineProps({
  fontes: {
    type: Array,
    default: () => [],
  },
  fonteId: {
    type: [String, Number],
    default: null,
  },
  salvando: {
    type: Boolean,
    default: false,
  },
  erro: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['fechar', 'salvar'])

const fonteSelect = ref(null)

const formulario = ref({
  fonteId: '',
  nome: '',
  srs: '',
  cobertura: '',
  coberturaPersonalizada: '',
  periodicidade: '',
  upload: true,
  api: false,
  endpoint: '',
  formatoApi: 'GeoJSON',
  autenticacao: '',
})

const sistemasReferencia = [

]

const coberturas = [
  'Brasil',
  'Paraná',
  'Região Sul',
  'Municipal',
  'Outro',
]

const periodicidades = [
  'Diária',
  'Semanal',
  'Mensal',
  'Trimestral',
  'Anual',
  'Sob demanda',
  'Única',
]

const formatosApi = [
  'GeoJSON',
  'WFS / GML',
  'Shapefile (.zip)',
]

const fontesAtivas = computed(() =>
  props.fontes.filter((fonte) => fonte.ativo === true),
)

const fonteSelecionada = computed(() =>
  fontesAtivas.value.find(
    (fonte) =>
      String(fonte.id) === String(formulario.value.fonteId),
  ),
)

const conjuntosDisponiveis = computed(() => {
  const oferece = fonteSelecionada.value?.oferece

  return Array.isArray(oferece)
    ? [...new Set(oferece)]
    : []
})

let elementoAnterior
let overflowAnterior

watch(
  () => props.fonteId,
  (id) => {
    formulario.value.fonteId = id ?? ''
    formulario.value.nome = ''
  },
  { immediate: true },
)

watch(conjuntosDisponiveis, (nomes) => {
  if (!nomes.includes(formulario.value.nome)) {
    formulario.value.nome = ''
  }
})

function alterarFonte() {
  formulario.value.nome = ''
}

function alternarEntrada(tipo) {
  if (props.salvando) return

  const outraEntrada = tipo === 'upload' ? 'api' : 'upload'

  if (
    formulario.value[tipo] &&
    !formulario.value[outraEntrada]
  ) {
    return
  }

  formulario.value[tipo] = !formulario.value[tipo]
}

function fechar() {
  if (props.salvando) return

  emit('fechar')
}

function salvar() {
  if (props.salvando || !fonteSelecionada.value) return

  if (!conjuntosDisponiveis.value.includes(formulario.value.nome)) {
    return
  }

  emit('salvar', {
    fonteId: fonteSelecionada.value.id,
    nome: formulario.value.nome,
    srs: formulario.value.srs,
    cobertura:
      formulario.value.cobertura === 'Outro'
        ? formulario.value.coberturaPersonalizada.trim()
        : formulario.value.cobertura,
    periodicidade: formulario.value.periodicidade,
    upload: formulario.value.upload,
    api: formulario.value.api,
    endpoint: formulario.value.api
      ? formulario.value.endpoint.trim()
      : '',
    formatoApi: formulario.value.api
      ? formulario.value.formatoApi
      : '',
    autenticacao: formulario.value.api
      ? formulario.value.autenticacao.trim()
      : '',
  })
}

function tratarTeclado(evento) {
  if (evento.key === 'Escape') {
    evento.preventDefault()
    fechar()
    return
  }

  if (evento.key !== 'Tab') return

  const elementos = Array.from(
    evento.currentTarget.querySelectorAll(
      'button, input, select, textarea, [tabindex="0"]',
    ),
  ).filter(
    (elemento) =>
      !elemento.matches(':disabled') &&
      elemento.getClientRects().length,
  )

  const primeiro = elementos[0]
  const ultimo = elementos[elementos.length - 1]

  if (!primeiro) {
    evento.preventDefault()
    evento.currentTarget.focus()
    return
  }

  if (
    evento.shiftKey &&
    (
      document.activeElement === primeiro ||
      document.activeElement === evento.currentTarget
    )
  ) {
    evento.preventDefault()
    ultimo.focus()
  } else if (
    !evento.shiftKey &&
    document.activeElement === ultimo
  ) {
    evento.preventDefault()
    primeiro.focus()
  }
}

onMounted(async () => {
  elementoAnterior = document.activeElement
  overflowAnterior = document.body.style.overflow

  document.body.style.overflow = 'hidden'

  await nextTick()
  fonteSelect.value?.focus()
})

onBeforeUnmount(() => {
  document.body.style.overflow = overflowAnterior
  elementoAnterior?.focus()
})
</script>

<template>
  <Teleport to="body">
    <div class="cadastros-overlay" @click.self="fechar">
      <section
        class="cadastros-modal cadastros-modal--amplo"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-formulario-conjunto"
        aria-describedby="descricao-formulario-conjunto"
        :aria-busy="salvando"
        tabindex="-1"
        @keydown="tratarTeclado"
      >
        <header class="cadastros-modal-cabecalho">
          <div>
            <h2 id="titulo-formulario-conjunto">
              Novo conjunto de dados
            </h2>
          </div>

          <button
            type="button"
            class="cadastros-fechar"
            aria-label="Fechar formulário"
            :disabled="salvando"
            @click="fechar"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <form @submit.prevent="salvar">
          <div class="cadastros-modal-conteudo">
            <p
              id="descricao-formulario-conjunto"
              class="conjunto-formulario-descricao"
            >
              Vincule o conjunto a uma fonte e configure
              suas informações e formas de entrada.
            </p>

            <fieldset
              class="conjunto-formulario-campos"
              :disabled="salvando"
            >
              <div class="cadastros-campo">
                <label for="conjunto-fonte">Fonte</label>

                <select
                  id="conjunto-fonte"
                  ref="fonteSelect"
                  v-model="formulario.fonteId"
                  required
                  @change="alterarFonte"
                >
                  <option value="" disabled>
                    Selecione uma fonte
                  </option>

                  <option
                    v-for="fonte in fontesAtivas"
                    :key="fonte.id"
                    :value="fonte.id"
                  >
                    {{ fonte.sigla }} — {{ fonte.nome }}
                  </option>
                </select>

                <p
                  v-if="!fontesAtivas.length"
                  class="cadastros-ajuda"
                >
                  Cadastre ou reative uma fonte para continuar.
                </p>
              </div>

              <div class="cadastros-campo">
                <label for="conjunto-nome">Conjunto</label>

                <select
                  id="conjunto-nome"
                  v-model="formulario.nome"
                  :disabled="!conjuntosDisponiveis.length"
                  required
                >
                  <option value="" disabled>
                    Selecione um conjunto
                  </option>

                  <option
                    v-for="nome in conjuntosDisponiveis"
                    :key="nome"
                    :value="nome"
                  >
                    {{ nome }}
                  </option>
                </select>

                <p class="cadastros-ajuda">
                  {{
                    fonteSelecionada && !conjuntosDisponiveis.length
                      ? 'Edite a fonte e informe os conjuntos que ela fornece.'
                      : 'São exibidos apenas os conjuntos declarados pela fonte.'
                  }}
                </p>
              </div>

              <div class="cadastros-duas-colunas">
                <div class="cadastros-campo">
                  <label for="conjunto-srs">
                    Sistema de referência
                  </label>

                  <select
                    id="conjunto-srs"
                    v-model="formulario.srs"
                    required
                  >
                    <option value="" disabled>Selecione</option>

                    <option
                      v-for="sistema in sistemasReferencia"
                      :key="sistema.valor"
                      :value="sistema.valor"
                    >
                      {{ sistema.nome }}
                    </option>
                  </select>
                </div>

                <div class="cadastros-campo">
                  <label for="conjunto-cobertura">
                    Cobertura
                  </label>

                  <select
                    id="conjunto-cobertura"
                    v-model="formulario.cobertura"
                    required
                  >
                    <option value="" disabled>Selecione</option>

                    <option
                      v-for="cobertura in coberturas"
                      :key="cobertura"
                      :value="cobertura"
                    >
                      {{ cobertura }}
                    </option>
                  </select>
                </div>
              </div>

              <div
                v-if="formulario.cobertura === 'Outro'"
                class="cadastros-campo"
              >
                <label for="conjunto-cobertura-personalizada">
                  Descrição da cobertura
                </label>

                <input
                  id="conjunto-cobertura-personalizada"
                  v-model="formulario.coberturaPersonalizada"
                  type="text"
                  required
                  placeholder="Informe a região abrangida"
                />
              </div>

              <div class="cadastros-campo">
                <label for="conjunto-periodicidade">
                  Periodicidade
                </label>

                <select
                  id="conjunto-periodicidade"
                  v-model="formulario.periodicidade"
                  required
                >
                  <option value="" disabled>Selecione</option>

                  <option
                    v-for="periodicidade in periodicidades"
                    :key="periodicidade"
                    :value="periodicidade"
                  >
                    {{ periodicidade }}
                  </option>
                </select>

                <p class="cadastros-ajuda">
                  Frequência de atualização da fonte.
                  A competência de cada arquivo é informada no upload.
                </p>
              </div>

              <fieldset class="cadastros-entrada">
                <legend>Como o dado chega</legend>

                <div class="cadastros-segmentos">
                  <button
                    type="button"
                    :class="{
                      'cadastros-segmento--ativo': formulario.upload,
                    }"
                    :aria-pressed="formulario.upload"
                    @click="alternarEntrada('upload')"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path
                        d="M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4"
                      />
                    </svg>

                    <strong>Upload</strong>
                    <small>Envio manual de arquivos</small>
                  </button>

                  <button
                    type="button"
                    :class="{
                      'cadastros-segmento--ativo': formulario.api,
                    }"
                    :aria-pressed="formulario.api"
                    @click="alternarEntrada('api')"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path
                        d="m8 8-4 4 4 4m8-8 4 4-4 4m-3-12-2 16"
                      />
                    </svg>

                    <strong>API</strong>
                    <small>Consulta pelo sistema</small>
                  </button>
                </div>

                <p class="cadastros-ajuda">
                  Selecione uma ou ambas as formas de entrada.
                </p>
              </fieldset>

              <section
                v-if="formulario.api"
                class="cadastros-api"
                aria-labelledby="titulo-configuracao-api"
              >
                <h3 id="titulo-configuracao-api">
                  Configuração da API
                </h3>

                <div class="cadastros-campo">
                  <label for="conjunto-endpoint">Endpoint</label>

                  <input
                    id="conjunto-endpoint"
                    v-model="formulario.endpoint"
                    type="url"
                    required
                    placeholder="https://..."
                  />
                </div>

                <div class="cadastros-duas-colunas">
                  <div class="cadastros-campo">
                    <label for="conjunto-formato-api">
                      Formato retornado
                    </label>

                    <select
                      id="conjunto-formato-api"
                      v-model="formulario.formatoApi"
                      required
                    >
                      <option
                        v-for="formato in formatosApi"
                        :key="formato"
                        :value="formato"
                      >
                        {{ formato }}
                      </option>
                    </select>
                  </div>

                  <div class="cadastros-campo">
                    <label for="conjunto-autenticacao">
                      Autenticação <span>(opcional)</span>
                    </label>

                    <input
                      id="conjunto-autenticacao"
                      v-model="formulario.autenticacao"
                      type="password"
                      autocomplete="new-password"
                      placeholder="Chave ou token"
                    />
                  </div>
                </div>
              </section>
            </fieldset>

            <p v-if="erro" class="cadastros-erro" role="alert">
              {{ erro }}
            </p>

            <p
              v-if="salvando"
              class="cadastros-ajuda"
              role="status"
            >
              Salvando conjunto...
            </p>
          </div>

          <footer class="cadastros-modal-rodape">
            <button
              type="button"
              class="cadastros-botao"
              :disabled="salvando"
              @click="fechar"
            >
              Cancelar
            </button>

            <button
              type="submit"
              class="cadastros-botao cadastros-botao--principal"
              :disabled="
                salvando ||
                !fonteSelecionada ||
                !conjuntosDisponiveis.length
              "
            >
              {{ salvando ? 'Salvando...' : 'Salvar conjunto' }}
            </button>
          </footer>
        </form>
      </section>
    </div>
  </Teleport>
</template>

<style scoped src="../assets/css/cadastros.css"></style>
<style scoped src="../assets/css/formulario-conjunto.css"></style>
