<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'

import {
  criarFormularioConjunto,
  validarFormularioConjunto,
  selecoesFormularioConjunto,
  conjuntosFornecidos,
  formatosApi,
} from '../services/conjuntoService'

const props = defineProps({
  conjunto: {
    type: Object,
    default: null,
  },
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
const formulario = ref({})

const editando = computed(() => props.conjunto?.id != null)

let elementoAnterior
let overflowAnterior

watch(
  [() => props.conjunto, () => props.fonteId],
  ([conjunto, fonteId]) => {
    formulario.value = criarFormularioConjunto(
      conjunto,
      fonteId,
    )

    tentouSalvar.value = false
    tocados.value = {}
  },
  { immediate: true },
)

const fontesAtivas = computed(() =>
  props.fontes.filter((fonte) => fonte.ativo === true),
)

const fonteSelecionada = computed(() =>
  fontesAtivas.value.find(
    (fonte) =>
      String(fonte.id) === String(formulario.value.fonteId),
  ),
)

const conjuntosDisponiveis = computed(() =>
  conjuntosFornecidos(
    fonteSelecionada.value,
    props.conjunto,
  ),
)

const camposSelecao = computed(() =>
  selecoesFormularioConjunto(
    props.fontes,
    fonteSelecionada.value,
    props.conjunto,
  ),
)

const erros = computed(() =>
  validarFormularioConjunto(
    formulario.value,
    props.fontes,
    props.conjuntos,
    props.conjunto,
  ),
)

function erroVisivel(campo) {
  return Boolean(
    (tentouSalvar.value || tocados.value[campo]) &&
    erros.value[campo],
  )
}

function tocar(campo) {
  tocados.value[campo] = true
}

function alterarSelecao(campo) {
  tocar(campo)

  if (campo === 'fonteId') {
    formulario.value.nome = ''
  }
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

    const invalido = Array.from(
      formularioElement.value?.querySelectorAll(
        '[aria-invalid="true"]',
      ) ?? [],
    ).find(
      (elemento) =>
        !elemento.matches(':disabled') &&
        elemento.getClientRects().length,
    )

    invalido?.focus()
    return
  }

  const payload = {
    ...formulario.value,
  }

  if (editando.value) {
    payload.id = props.conjunto.id
  }

  emit('salvar', payload)
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

function registrarSelect(elemento, chave) {
  if (chave === 'fonteId') {
    fonteSelect.value = elemento
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
              {{ editando ? 'Editar conjunto de dados' : 'Novo conjunto de dados' }}
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
              {{
                editando
                  ? 'Atualize as informações e as formas de entrada do conjunto.'
                  : 'Vincule o conjunto a uma fonte e configure suas informações.'
              }}
            </p>

            <fieldset
              class="conjunto-formulario-campos"
              :disabled="salvando"
            >
              <template
                v-for="campo in camposSelecao"
                :key="campo.chave"
              >
                <div class="cadastros-campo">
                  <label :for="`conjunto-${campo.chave}`">
                    {{ campo.titulo }}
                  </label>

                  <select
                    :id="`conjunto-${campo.chave}`"
                    :ref="(elemento) => registrarSelect(elemento, campo.chave)"
                    v-model="formulario[campo.chave]"
                    required
                    :disabled="
                      campo.chave === 'nome' &&
                      !conjuntosDisponiveis.length
                    "
                    :aria-invalid="erroVisivel(campo.chave)"
                    :aria-describedby="
                      erroVisivel(campo.chave)
                        ? `erro-conjunto-${campo.chave}`
                        : campo.ajuda
                          ? `ajuda-conjunto-${campo.chave}`
                          : undefined
                    "
                    :class="{
                      'conjunto-campo--invalido':
                        erroVisivel(campo.chave),
                    }"
                    @blur="tocar(campo.chave)"
                    @change="alterarSelecao(campo.chave)"
                  >
                    <option value="" disabled>Selecione</option>

                    <option
                      v-for="opcao in campo.opcoes"
                      :key="opcao.valor"
                      :value="opcao.valor"
                    >
                      {{ opcao.nome }}
                    </option>
                  </select>

                  <p
                    v-if="campo.ajuda"
                    :id="`ajuda-conjunto-${campo.chave}`"
                    class="cadastros-ajuda"
                  >
                    {{ campo.ajuda }}
                  </p>

                  <p
                    v-if="erroVisivel(campo.chave)"
                    :id="`erro-conjunto-${campo.chave}`"
                    class="conjunto-erro-campo"
                  >
                    {{ erros[campo.chave] }}
                  </p>
                </div>

                <div
                  v-if="
                    campo.chave === 'cobertura' &&
                    formulario.cobertura === 'Outro'
                  "
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
                    placeholder="Informe a região abrangida"
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
              </template>

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
                      <path d="M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4" />
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
                      <path d="m8 8-4 4 4 4m8-8 4 4-4 4m-3-12-2 16" />
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
                    placeholder="https://..."
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
                      :placeholder="
                        editando ? 'Informe para substituir' : 'Chave ou token'
                      "
                    />

                    <p v-if="editando" class="cadastros-ajuda">
                      Deixe vazio para manter a autenticação existente.
                    </p>
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

            <p v-if="salvando" class="cadastros-ajuda" role="status">
              {{ editando ? 'Salvando alterações...' : 'Salvando conjunto...' }}
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
              {{
                salvando
                  ? 'Salvando...'
                  : editando
                    ? 'Salvar alterações'
                    : 'Salvar conjunto'
              }}
            </button>
          </footer>
        </form>
      </section>
    </div>
  </Teleport>
</template>

<style scoped src="../assets/css/cadastros.css"></style>
<style scoped src="../assets/css/formulario-conjunto.css"></style>
