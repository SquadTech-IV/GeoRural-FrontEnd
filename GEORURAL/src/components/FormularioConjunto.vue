<script setup>
import {computed,nextTick,onBeforeUnmount,onMounted,ref,watch,} from 'vue'

const props = defineProps({
  fontes: {
    type: Array,
    default: () => [],
  },
  conjuntos: {
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
const formularioElement = ref(null)
const tentouSalvar = ref(false)
const tocados = ref({})

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
    tentouSalvar.value = false
    tocados.value = {}
  },
  { immediate: true },
)

watch(conjuntosDisponiveis, (nomes) => {
  if (!nomes.includes(formulario.value.nome)) {
    formulario.value.nome = ''
  }
})

function normalizar(valor) {
  return String(valor ?? '').trim().toLocaleLowerCase('pt-BR')
}

const erros = computed(() => {
  const resultado = {}
  const dados = formulario.value
  const fonte = fonteSelecionada.value

  if (!fonte) {
    resultado.fonteId = 'Selecione uma fonte ativa.'
  }

  if (!dados.nome) {
    resultado.nome = 'Selecione um conjunto.'
  } else if (!conjuntosDisponiveis.value.includes(dados.nome)) {
    resultado.nome = 'O conjunto deve ser fornecido pela fonte selecionada.'
  } else if (
    fonte &&
    props.conjuntos.some(
      (conjunto) =>
        String(conjunto.fonteId) === String(fonte.id) &&
        normalizar(conjunto.nome) === normalizar(dados.nome),
    )
  ) {
    resultado.nome =
      'Esse conjunto já está cadastrado para a fonte. Edite o cadastro existente.'
  }

  if (
    !sistemasReferencia.some(
      (sistema) => sistema.valor === dados.srs,
    )
  ) {
    resultado.srs = 'Selecione um sistema de referência válido.'
  }

  if (!coberturas.includes(dados.cobertura)) {
    resultado.cobertura = 'Selecione a cobertura do conjunto.'
  }

  if (dados.cobertura === 'Outro') {
    const descricao = dados.coberturaPersonalizada.trim()

    if (!descricao) {
      resultado.coberturaPersonalizada =
        'Descreva a região abrangida pelo conjunto.'
    } else if (descricao.length > 200) {
      resultado.coberturaPersonalizada =
        'A descrição deve ter no máximo 200 caracteres.'
    }
  }

  if (!periodicidades.includes(dados.periodicidade)) {
    resultado.periodicidade = 'Selecione uma periodicidade válida.'
  }

  if (!dados.upload && !dados.api) {
    resultado.entrada = 'Selecione Upload, API ou ambas as opções.'
  }

  if (dados.api) {
    const endpoint = dados.endpoint.trim()

    if (!endpoint) {
      resultado.endpoint = 'Informe o endpoint da API.'
    } else {
      try {
        const url = new URL(endpoint)

        if (!['http:', 'https:'].includes(url.protocol)) {
          resultado.endpoint =
            'O endpoint deve começar com http:// ou https://.'
        } else if (url.username || url.password) {
          resultado.endpoint =
            'Informe a autenticação no campo próprio, sem credenciais na URL.'
        }
      } catch {
        resultado.endpoint = 'Informe uma URL válida para o endpoint.'
      }
    }

    if (!formatosApi.includes(dados.formatoApi)) {
      resultado.formatoApi = 'Selecione um formato retornado válido.'
    }
  }

  return resultado
})

function erroVisivel(campo) {
  return (
    (tentouSalvar.value || tocados.value[campo]) &&
    Boolean(erros.value[campo])
  )
}

function tocar(campo) {
  tocados.value[campo] = true
}

function alterarFonte() {
  formulario.value.nome = ''
  tocar('fonteId')
}

function alternarEntrada(tipo) {
  if (props.salvando) return

  formulario.value[tipo] = !formulario.value[tipo]
  tocar('entrada')
}

function fechar() {
  if (props.salvando) return

  emit('fechar')
}

async function salvar() {
  if (props.salvando) return

  tentouSalvar.value = true

  if (Object.keys(erros.value).length) {
    await nextTick()

    formularioElement.value
      ?.querySelector('[aria-invalid="true"]')
      ?.focus()

    return
  }

  const dados = formulario.value

  emit('salvar', {
    fonteId: fonteSelecionada.value.id,
    nome: dados.nome,
    srs: dados.srs,
    cobertura:
      dados.cobertura === 'Outro'
        ? dados.coberturaPersonalizada.trim()
        : dados.cobertura,
    periodicidade: dados.periodicidade,
    upload: dados.upload,
    api: dados.api,
    endpoint: dados.api ? dados.endpoint.trim() : '',
    formatoApi: dados.api ? dados.formatoApi : '',
    autenticacao: dados.api ? dados.autenticacao.trim() : '',
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
            <span class="cadastros-identificacao">
              CADASTRO DE CONJUNTO
            </span>

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

        <form
          ref="formularioElement"
          novalidate
          @submit.prevent="salvar"
        >
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
                  :aria-invalid="erroVisivel('fonteId')"
                  :aria-describedby="
                    erroVisivel('fonteId')
                      ? 'erro-conjunto-fonte'
                      : 'ajuda-conjunto-fonte'
                  "
                  :class="{
                    'conjunto-campo--invalido': erroVisivel('fonteId'),
                  }"
                  @change="alterarFonte"
                  @blur="tocar('fonteId')"
                >
                  <option value="" disabled>Selecione uma fonte</option>

                  <option
                    v-for="fonte in fontesAtivas"
                    :key="fonte.id"
                    :value="fonte.id"
                  >
                    {{ fonte.sigla }} — {{ fonte.nome }}
                  </option>
                </select>

                <p
                  id="ajuda-conjunto-fonte"
                  class="cadastros-ajuda"
                >
                  {{
                    fontesAtivas.length
                      ? 'Apenas fontes ativas podem receber novos conjuntos.'
                      : 'Cadastre ou reative uma fonte para continuar.'
                  }}
                </p>

                <p
                  v-if="erroVisivel('fonteId')"
                  id="erro-conjunto-fonte"
                  class="conjunto-erro-campo"
                >
                  {{ erros.fonteId }}
                </p>
              </div>

              <div class="cadastros-campo">
                <label for="conjunto-nome">Conjunto</label>

                <select
                  id="conjunto-nome"
                  v-model="formulario.nome"
                  :disabled="!conjuntosDisponiveis.length"
                  required
                  :aria-invalid="erroVisivel('nome')"
                  :aria-describedby="
                    erroVisivel('nome')
                      ? 'erro-conjunto-nome'
                      : 'ajuda-conjunto-nome'
                  "
                  :class="{
                    'conjunto-campo--invalido': erroVisivel('nome'),
                  }"
                  @blur="tocar('nome')"
                  @change="tocar('nome')"
                >
                  <option value="" disabled>Selecione um conjunto</option>

                  <option
                    v-for="nome in conjuntosDisponiveis"
                    :key="nome"
                    :value="nome"
                  >
                    {{ nome }}
                  </option>
                </select>

                <p
                  id="ajuda-conjunto-nome"
                  class="cadastros-ajuda"
                >
                  {{
                    fonteSelecionada && !conjuntosDisponiveis.length
                      ? 'Edite a fonte e informe os conjuntos que ela fornece.'
                      : 'São exibidos apenas os conjuntos declarados pela fonte.'
                  }}
                </p>

                <p
                  v-if="erroVisivel('nome')"
                  id="erro-conjunto-nome"
                  class="conjunto-erro-campo"
                >
                  {{ erros.nome }}
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
                    :aria-invalid="erroVisivel('srs')"
                    :aria-describedby="
                      erroVisivel('srs')
                        ? 'erro-conjunto-srs'
                        : undefined
                    "
                    :class="{
                      'conjunto-campo--invalido': erroVisivel('srs'),
                    }"
                    @blur="tocar('srs')"
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

                  <p
                    v-if="erroVisivel('srs')"
                    id="erro-conjunto-srs"
                    class="conjunto-erro-campo"
                  >
                    {{ erros.srs }}
                  </p>
                </div>

                <div class="cadastros-campo">
                  <label for="conjunto-cobertura">Cobertura</label>

                  <select
                    id="conjunto-cobertura"
                    v-model="formulario.cobertura"
                    required
                    :aria-invalid="erroVisivel('cobertura')"
                    :aria-describedby="
                      erroVisivel('cobertura')
                        ? 'erro-conjunto-cobertura'
                        : undefined
                    "
                    :class="{
                      'conjunto-campo--invalido':
                        erroVisivel('cobertura'),
                    }"
                    @blur="tocar('cobertura')"
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

                  <p
                    v-if="erroVisivel('cobertura')"
                    id="erro-conjunto-cobertura"
                    class="conjunto-erro-campo"
                  >
                    {{ erros.cobertura }}
                  </p>
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
                  maxlength="200"
                  :aria-invalid="erroVisivel('coberturaPersonalizada')"
                  :aria-describedby="
                    erroVisivel('coberturaPersonalizada')
                      ? 'erro-conjunto-cobertura-personalizada'
                      : undefined
                  "
                  :class="{
                    'conjunto-campo--invalido':
                      erroVisivel('coberturaPersonalizada'),
                  }"
                  placeholder="Informe a região abrangida"
                  @blur="tocar('coberturaPersonalizada')"
                />

                <p
                  v-if="erroVisivel('coberturaPersonalizada')"
                  id="erro-conjunto-cobertura-personalizada"
                  class="conjunto-erro-campo"
                >
                  {{ erros.coberturaPersonalizada }}
                </p>
              </div>

              <div class="cadastros-campo">
                <label for="conjunto-periodicidade">
                  Periodicidade
                </label>

                <select
                  id="conjunto-periodicidade"
                  v-model="formulario.periodicidade"
                  required
                  :aria-invalid="erroVisivel('periodicidade')"
                  :aria-describedby="
                    erroVisivel('periodicidade')
                      ? 'erro-conjunto-periodicidade'
                      : 'ajuda-conjunto-periodicidade'
                  "
                  :class="{
                    'conjunto-campo--invalido':
                      erroVisivel('periodicidade'),
                  }"
                  @blur="tocar('periodicidade')"
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

                <p
                  id="ajuda-conjunto-periodicidade"
                  class="cadastros-ajuda"
                >
                  Frequência de atualização da fonte.
                  A competência de cada arquivo é informada no upload.
                </p>

                <p
                  v-if="erroVisivel('periodicidade')"
                  id="erro-conjunto-periodicidade"
                  class="conjunto-erro-campo"
                >
                  {{ erros.periodicidade }}
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
                    :aria-invalid="erroVisivel('entrada')"
                    :aria-describedby="
                      erroVisivel('entrada')
                        ? 'erro-conjunto-entrada'
                        : undefined
                    "
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

                <p
                  v-if="erroVisivel('entrada')"
                  id="erro-conjunto-entrada"
                  class="conjunto-erro-campo"
                >
                  {{ erros.entrada }}
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
                    :aria-invalid="erroVisivel('endpoint')"
                    :aria-describedby="
                      erroVisivel('endpoint')
                        ? 'erro-conjunto-endpoint'
                        : undefined
                    "
                    :class="{
                      'conjunto-campo--invalido':
                        erroVisivel('endpoint'),
                    }"
                    placeholder="https://..."
                    @blur="tocar('endpoint')"
                  />

                  <p
                    v-if="erroVisivel('endpoint')"
                    id="erro-conjunto-endpoint"
                    class="conjunto-erro-campo"
                  >
                    {{ erros.endpoint }}
                  </p>
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
                      :aria-invalid="erroVisivel('formatoApi')"
                      :aria-describedby="
                        erroVisivel('formatoApi')
                          ? 'erro-conjunto-formato-api'
                          : undefined
                      "
                      :class="{
                        'conjunto-campo--invalido':
                          erroVisivel('formatoApi'),
                      }"
                      @blur="tocar('formatoApi')"
                    >
                      <option
                        v-for="formato in formatosApi"
                        :key="formato"
                        :value="formato"
                      >
                        {{ formato }}
                      </option>
                    </select>

                    <p
                      v-if="erroVisivel('formatoApi')"
                      id="erro-conjunto-formato-api"
                      class="conjunto-erro-campo"
                    >
                      {{ erros.formatoApi }}
                    </p>
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

            <p
              v-if="tentouSalvar && Object.keys(erros).length"
              class="conjunto-validacao-resumo"
              role="alert"
            >
              Revise os campos indicados antes de salvar.
            </p>

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
              :disabled="salvando"
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
