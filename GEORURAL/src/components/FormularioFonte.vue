<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
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

const nomeInput = ref(null)

const formulario = ref({
  nome: '',
  sigla: '',
  esfera: '',
  oferece: [],
})

const tiposConjunto = [
  {
    nome: 'Imóvel rural (perímetro)',
    indicadores: 'Base · todos',
  },
  {
    nome: 'APP declarada',
    indicadores: 'IAPP · ICV',
  },
  {
    nome: 'Reserva Legal declarada',
    indicadores: 'IRL',
  },
  {
    nome: 'Vegetação nativa',
    indicadores: 'ICV · IAPP',
  },
  {
    nome: 'Limites de biomas',
    indicadores: 'IRL',
  },
  {
    nome: 'Áreas protegidas e territórios especiais',
    indicadores: 'ISAP',
  },
  {
    nome: 'Embargos ambientais',
    indicadores: 'IAE',
  },
  {
    nome: 'Desmatamento',
    indicadores: 'IDesmat',
  },
  {
    nome: 'Focos de calor',
    indicadores: 'IFC',
  },
  {
    nome: 'Malha municipal',
    indicadores: 'Agregação',
  },
]

let elementoAnterior
let overflowAnterior

function fechar() {
  if (props.salvando) return

  emit('fechar')
}

function salvar() {
  if (props.salvando) return

  emit('salvar', {
    nome: formulario.value.nome.trim(),
    sigla: formulario.value.sigla.trim(),
    esfera: formulario.value.esfera.trim(),
    oferece: [...formulario.value.oferece],
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
      'button:not([disabled]), input:not([disabled]), ' +
      'select:not([disabled]), textarea:not([disabled]), ' +
      '[tabindex="0"]',
    ),
  ).filter((elemento) => elemento.getClientRects().length)

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
    <div
      class="cadastros-overlay"
      @click.self="fechar"
    >
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

        <form @submit.prevent="salvar">
          <div class="cadastros-modal-conteudo">
            <p
              id="descricao-formulario-fonte"
              class="fonte-formulario-descricao"
            >
              Informe o órgão de origem e selecione
              os conjuntos de dados que ele fornece.
            </p>

            <fieldset
              class="fonte-formulario-campos"
              :disabled="salvando"
            >
              <div class="cadastros-campo">
                <label for="fonte-nome">
                  Nome da fonte
                </label>

                <input
                  id="fonte-nome"
                  ref="nomeInput"
                  v-model="formulario.nome"
                  type="text"
                  required
                  placeholder="Informe o nome do órgão ou instituição"
                />
              </div>

              <div class="cadastros-duas-colunas">
                <div class="cadastros-campo">
                  <label for="fonte-sigla">
                    Sigla / órgão
                  </label>

                  <input
                    id="fonte-sigla"
                    v-model="formulario.sigla"
                    type="text"
                    required
                    placeholder="Informe a sigla"
                  />
                </div>

                <div class="cadastros-campo">
                  <label for="fonte-esfera">
                    Esfera <span>(opcional)</span>
                  </label>

                  <select
                    id="fonte-esfera"
                    v-model="formulario.esfera"
                  >
                    <option value="">Selecione</option>
                    <option value="Federal">Federal</option>
                    <option value="Estadual">Estadual</option>
                    <option value="Municipal">Municipal</option>
                    <option value="Outra">Outra</option>
                  </select>
                </div>
              </div>

              <fieldset class="fonte-formulario-tipos">
                <legend>
                  Conjuntos que esta fonte fornece
                </legend>

                <p class="cadastros-ajuda">
                  Você pode selecionar mais de um conjunto.
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
                    />

                    <span>{{ tipo.nome }}</span>

                    <small>{{ tipo.indicadores }}</small>
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
              v-if="erro"
              class="cadastros-erro"
              role="alert"
            >
              {{ erro }}
            </p>

            <p
              v-if="salvando"
              class="cadastros-ajuda"
              role="status"
            >
              Salvando fonte...
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
              {{ salvando ? 'Salvando...' : 'Salvar fonte' }}
            </button>
          </footer>
        </form>
      </section>
    </div>
  </Teleport>
</template>

<style scoped src="../assets/css/cadastros.css"></style>
<style scoped src="../assets/css/formulario-fonte.css"></style>
