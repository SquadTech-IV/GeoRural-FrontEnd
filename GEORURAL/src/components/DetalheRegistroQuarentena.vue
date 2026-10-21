<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
} from 'vue'

import {
  criarConsultaDetalheQuarentena,
} from '../services/quarentenaDetalheService'

import {
  prepararCamposInvalidos,
} from '../services/quarentenaCamposInvalidosService'

const props = defineProps({
  registroId: {
    type: [String, Number],
    required: true,
  },
})

const emit = defineEmits([
  'fechar',
  'erro',
])

const dialogo = ref(null)

const {
  detalhe,
  carregando,
  falhou,
  consultar,
  destruir,
} = criarConsultaDetalheQuarentena()

const camposExibidos = computed(() =>
  prepararCamposInvalidos(detalhe.value),
)

const possuiDestaques = computed(() =>
  camposExibidos.value.some(
    campo => campo.destaque,
  ),
)

let elementoAnterior = null
let overflowAnterior = ''
let desmontado = false

async function carregar() {
  try {
    await consultar(props.registroId)
  } catch (erro) {
    if (desmontado) return

    emit(
      'erro',
      erro.message ||
        'Não foi possível consultar a inconsistência.',
    )
  }
}

function fechar() {
  emit('fechar')
}

function cancelar(evento) {
  evento.preventDefault()
  fechar()
}

function clicarFora(evento) {
  if (evento.target !== dialogo.value) return

  const limites =
    dialogo.value.getBoundingClientRect()

  const fora =
    evento.clientX < limites.left ||
    evento.clientX > limites.right ||
    evento.clientY < limites.top ||
    evento.clientY > limites.bottom

  if (fora) fechar()
}

onMounted(async () => {
  elementoAnterior = document.activeElement
  overflowAnterior = document.body.style.overflow

  document.body.style.overflow = 'hidden'

  await nextTick()

  if (desmontado) return

  dialogo.value?.showModal()
  carregar()
})

onBeforeUnmount(() => {
  desmontado = true

  destruir()

  dialogo.value?.close()
  document.body.style.overflow = overflowAnterior

  if (elementoAnterior?.isConnected) {
    elementoAnterior.focus()
  }
})
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialogo"
      class="quarentena-detalhe-dialogo"
      aria-labelledby="quarentena-detalhe-titulo"
      :aria-busy="carregando"
      @cancel="cancelar"
      @click="clicarFora"
    >
      <header class="quarentena-detalhe-cabecalho">
        <div>
          <h2 id="quarentena-detalhe-titulo">
            Detalhamento da inconsistência
          </h2>

          <p>
            Registro em quarentena {{ registroId }}
          </p>
        </div>

        <button
          type="button"
          class="quarentena-detalhe-fechar"
          aria-label="Fechar detalhamento"
          autofocus
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

      <div class="quarentena-detalhe-conteudo">
        <p
          v-if="carregando"
          class="quarentena-detalhe-estado"
          role="status"
        >
          Consultando a inconsistência...
        </p>

        <div
          v-else-if="falhou"
          class="quarentena-detalhe-estado"
        >
          <button
            type="button"
            class="quarentena-detalhe-botao"
            @click="carregar"
          >
            Tentar novamente
          </button>
        </div>

        <template v-else-if="detalhe">
          <p
            v-if="possuiDestaques"
            class="quarentena-detalhe-legenda"
          >
            Os destaques identificam o campo apontado
            pela validação e o valor recebido.
          </p>

          <dl class="quarentena-detalhe-campos">
            <div
              v-for="campo in camposExibidos"
              :key="campo.chave"
              :class="{
                'quarentena-detalhe-campo--invalido':
                  campo.destaque,
              }"
            >
              <dt>{{ campo.titulo }}</dt>

              <dd>{{ campo.valor }}</dd>

              <dd
                v-if="campo.identificacao"
                class="quarentena-detalhe-identificacao"
              >
                {{ campo.identificacao }}
              </dd>
            </div>
          </dl>

          <section
            class="quarentena-detalhe-motivo"
            aria-labelledby="quarentena-detalhe-motivo-titulo"
          >
            <h3 id="quarentena-detalhe-motivo-titulo">
              Motivo da rejeição
            </h3>

            <p>{{ detalhe.motivo }}</p>
          </section>
        </template>
      </div>

      <footer class="quarentena-detalhe-rodape">
        <button
          type="button"
          class="quarentena-detalhe-botao"
          @click="fechar"
        >
          Fechar
        </button>
      </footer>
    </dialog>
  </Teleport>
</template>

<style scoped src="../assets/css/detalhe-registro-quarentena.css"></style>
