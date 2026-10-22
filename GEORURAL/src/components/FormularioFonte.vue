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
  criarFormularioFonte,
  validarFonte,
  tiposFonte,
  esferasFonte,
  possuiConjuntoDaFonte,
} from '../services/fonteService'

const props = defineProps({
  fonte: {
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
  salvando: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['fechar', 'salvar', 'erro'])

const nomeInput = ref(null)
const formularioElement = ref(null)
const tentouSalvar = ref(false)
const tocados = ref({})
const formulario = ref({})

const editando = computed(() => props.fonte?.id != null)
const tiposConjunto = tiposFonte

const esferas = computed(() => [
  ...new Set([
    ...esferasFonte,
    ...(props.fonte?.esfera ? [props.fonte.esfera] : []),
  ]),
])

let elementoAnterior
let overflowAnterior

watch(
  () => props.fonte,
  (fonte) => {
    formulario.value = criarFormularioFonte(fonte)
    tentouSalvar.value = false
    tocados.value = {}
  },
  { immediate: true },
)

const erros = computed(() =>
  validarFonte(
    formulario.value,
    props.fontes,
    props.fonte?.id,
    props.conjuntos,
  ),
)

function possuiConjuntoCadastrado(nome) {
  return possuiConjuntoDaFonte(
    props.conjuntos,
    props.fonte?.id,
    nome,
  )
}

function erroVisivel(campo) {
  return Boolean(
    (tentouSalvar.value || tocados.value[campo]) &&
    erros.value[campo],
  )
}

function fechar() {
  if (!props.salvando) {
    emit('fechar')
  }
}

async function salvar() {
  if (props.salvando) return

  tentouSalvar.value = true

  if (Object.keys(erros.value).length) {
    emit(
      'erro',
      [...new Set(Object.values(erros.value))].join(' '),
    )

    await nextTick()

    formularioElement.value
      ?.querySelector('[aria-invalid="true"]:not(:disabled)')
      ?.focus()

    return
  }

  const dados = {
    ...formulario.value,
    oferece: [...formulario.value.oferece],
  }

  if (editando.value) {
    dados.id = props.fonte.id
  }

  emit('salvar', dados)
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
      'button:not([disabled]), input:not([disabled]), ' +
      'select:not([disabled]), textarea:not([disabled]), ' +
      '[tabindex="0"]',
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
  nomeInput.value?.focus()
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
        class="cadastros-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-formulario-fonte"
        aria-describedby="descricao-formulario-fonte"
        :aria-busy="salvando"
        tabindex="-1"
        @keydown="tratarTeclado"
      >
        <header class="cadastros-modal-cabecalho">
          <div>
            <h2 id="titulo-formulario-fonte">
              Nova fonte
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
              id="descricao-formulario-fonte"
              class="fonte-formulario-descricao"
            >
              {{
                editando
                  ? 'Atualize as informações da fonte e os conjuntos que ela fornece.'
                  : 'Informe o órgão de origem e selecione os conjuntos que ele fornece.'
              }}
              Nome e sigla são obrigatórios.
            </p>

            <fieldset
              class="fonte-formulario-campos"
              :disabled="salvando"
            >
              <div class="cadastros-campo">
                <label for="fonte-nome">Nome da fonte</label>

                <input
                  id="fonte-nome"
                  ref="nomeInput"
                  v-model="formulario.nome"
                  type="text"
                  required
                  maxlength="200"
                  :class="{
                    'fonte-campo--invalido': erroVisivel('nome'),
                  }"
                  :aria-invalid="erroVisivel('nome')"
                  placeholder="Informe o nome do órgão ou instituição"
                  @blur="tocados.nome = true"
                />
              </div>

              <div class="cadastros-duas-colunas">
                <div class="cadastros-campo">
                  <label for="fonte-sigla">Sigla / órgão</label>

                  <input
                    id="fonte-sigla"
                    v-model="formulario.sigla"
                    type="text"
                    required
                    maxlength="30"
                    :class="{
                      'fonte-campo--invalido': erroVisivel('sigla'),
                    }"
                    :aria-invalid="erroVisivel('sigla')"
                    placeholder="Informe a sigla"
                    @blur="tocados.sigla = true"
                  />
                </div>

                <div class="cadastros-campo">
                  <label for="fonte-esfera">
                    Esfera <span>(opcional)</span>
                  </label>

                  <select
                    id="fonte-esfera"
                    v-model="formulario.esfera"
                    :class="{
                      'fonte-campo--invalido': erroVisivel('esfera'),
                    }"
                    :aria-invalid="erroVisivel('esfera')"
                    @blur="tocados.esfera = true"
                  >
                    <option value="">Selecione</option>

                    <option
                      v-for="esfera in esferas"
                      :key="esfera"
                      :value="esfera"
                    >
                      {{ esfera }}
                    </option>
                  </select>
                </div>
              </div>

              <fieldset class="fonte-formulario-tipos">
                <legend>
                  Conjuntos que esta fonte fornece
                </legend>

                <p class="cadastros-ajuda">
                  {{
                    editando
                      ? 'Tipos com conjuntos cadastrados devem permanecer selecionados.'
                      : 'Você pode selecionar mais de um conjunto.'
                  }}
                </p>

                <div class="fonte-formulario-opcoes">
                  <label
                    v-for="tipo in tiposConjunto"
                    :key="tipo.nome"
                    class="fonte-formulario-opcao"
                    :class="{
                      'fonte-formulario-opcao--selecionada':
                        formulario.oferece.includes(tipo.nome),
                    }"
                  >
                    <input
                      v-model="formulario.oferece"
                      type="checkbox"
                      :value="tipo.nome"
                      :disabled="possuiConjuntoCadastrado(tipo.nome)"
                    />

                    <span>{{ tipo.nome }}</span>

                    <small>
                      {{
                        possuiConjuntoCadastrado(tipo.nome)
                          ? 'Cadastrado'
                          : tipo.indicadores
                      }}
                    </small>
                  </label>
                </div>

                <p
                  class="fonte-formulario-contagem"
                  aria-live="polite"
                >
                  {{ formulario.oferece.length }}
                  {{
                    formulario.oferece.length === 1
                      ? 'conjunto selecionado'
                      : 'conjuntos selecionados'
                  }}
                </p>
              </fieldset>
            </fieldset>

            <p
              v-if="salvando"
              class="cadastros-ajuda"
              role="status"
            >
              {{
                editando
                  ? 'Salvando alterações...'
                  : 'Salvando fonte...'
              }}
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
                    : 'Salvar fonte'
              }}
            </button>
          </footer>
        </form>
      </section>
    </div>
  </Teleport>
</template>

<style scoped src="../assets/css/cadastros.css"></style>
<style scoped src="../assets/css/formulario-fonte.css"></style>
