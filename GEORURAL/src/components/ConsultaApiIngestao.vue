<script setup>
import {
<<<<<<< HEAD
=======
  computed,
>>>>>>> cba4571be93906c02346280169a1428756bbb4f0
  onBeforeUnmount,
  ref,
  watch,
} from 'vue'

import {
  consultaIngestaoCancelada,
  ingestaoService,
} from '../services/ingestaoService'

<<<<<<< HEAD
=======
defineOptions({ name: 'ConsultaApiIngestao' })

>>>>>>> cba4571be93906c02346280169a1428756bbb4f0
const props = defineProps({
  conjuntoId: {
    type: [String, Number],
    default: null,
  },
<<<<<<< HEAD
=======
  disabled: {
    type: Boolean,
    default: false,
  },
>>>>>>> cba4571be93906c02346280169a1428756bbb4f0
  desabilitado: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'consultado',
<<<<<<< HEAD
  'limpar',
])

const consultando = ref(false)
const erro = ref('')
const concluida = ref(false)

let consulta = null
=======
  'selecionar',
  'limpar',
  'erro',
])

const carregando = ref(false)
const consultado = ref(false)
const itens = ref([])
const selecionados = ref([])
const falhou = ref(false)

let consulta = null
let destruido = false

const bloqueado = computed(() =>
  props.disabled || props.desabilitado,
)

const temConjunto = computed(() =>
  String(props.conjuntoId ?? '').trim() !== '',
)

const podeConsultar = computed(() =>
  !bloqueado.value && !carregando.value && temConjunto.value,
)

function identificador(item) {
  return item?.identificador ?? null
}

function estaSelecionado(item) {
  return selecionados.value.includes(identificador(item))
}

function alternarSelecao(item) {
  const id = identificador(item)

  if (
    bloqueado.value ||
    carregando.value ||
    !id ||
    item.jaRecebido
  ) {
    return
  }

  selecionados.value = estaSelecionado(item)
    ? selecionados.value.filter(atual => atual !== id)
    : [...selecionados.value, id]

  emit(
    'selecionar',
    itens.value.filter(atual =>
      selecionados.value.includes(atual.identificador),
    ),
  )
}

function limparResultado() {
  consultado.value = false
  itens.value = []
  selecionados.value = []
  falhou.value = false

  emit('consultado', null)
  emit('selecionar', [])
  emit('limpar')
}
>>>>>>> cba4571be93906c02346280169a1428756bbb4f0

function limparConsulta() {
  consulta?.abort()
  consulta = null
<<<<<<< HEAD

  consultando.value = false
  erro.value = ''
  concluida.value = false

  emit('limpar')
}

watch(
  () => props.conjuntoId,
  limparConsulta,
)

async function consultar() {
  if (props.desabilitado || consultando.value) return
=======
  carregando.value = false
  limparResultado()
}

async function consultar() {
  if (!podeConsultar.value || destruido) return
>>>>>>> cba4571be93906c02346280169a1428756bbb4f0

  consulta?.abort()

  const atual = new AbortController()
<<<<<<< HEAD
  consulta = atual

  consultando.value = true
  erro.value = ''
  concluida.value = false

  emit('limpar')

  try {
    const resposta =
      await ingestaoService.consultarDisponiveis(
        props.conjuntoId,
        {
          signal: atual.signal,
        },
      )

    if (
      atual.signal.aborted ||
      consulta !== atual
    ) {
      return
    }

    concluida.value = true

    emit('consultado', {
      conjuntoId: props.conjuntoId,
      resposta,
    })
  } catch (falha) {
    if (
      atual.signal.aborted ||
      consulta !== atual ||
      consultaIngestaoCancelada(falha)
=======
  const conjuntoId = String(props.conjuntoId)

  consulta = atual
  carregando.value = true
  limparResultado()

  try {
    const dados = await ingestaoService.consultarDisponiveis(
      conjuntoId,
      { signal: atual.signal },
    )

    if (
      destruido ||
      atual.signal.aborted ||
      consulta !== atual ||
      String(props.conjuntoId) !== conjuntoId
>>>>>>> cba4571be93906c02346280169a1428756bbb4f0
    ) {
      return
    }

<<<<<<< HEAD
    erro.value = falha.message
  } finally {
    if (consulta === atual) {
      consultando.value = false
=======
    itens.value = dados
    consultado.value = true

    emit('consultado', {
      conjuntoId,
      resposta: dados,
    })
  } catch (erro) {
    if (
      destruido ||
      atual.signal.aborted ||
      consulta !== atual ||
      consultaIngestaoCancelada(erro)
    ) {
      return
    }

    falhou.value = true
    emit('erro', erro)
  } finally {
    if (!destruido && consulta === atual) {
      carregando.value = false
>>>>>>> cba4571be93906c02346280169a1428756bbb4f0
      consulta = null
    }
  }
}

<<<<<<< HEAD
onBeforeUnmount(() => {
=======
watch(
  () => props.conjuntoId,
  limparConsulta,
  { flush: 'sync' },
)

onBeforeUnmount(() => {
  destruido = true
>>>>>>> cba4571be93906c02346280169a1428756bbb4f0
  consulta?.abort()
})
</script>

<template>
  <section
    class="consulta-api"
    aria-labelledby="consulta-api-titulo"
<<<<<<< HEAD
    :aria-busy="consultando"
  >
    <h3 id="consulta-api-titulo">
      Entrada por API
    </h3>

    <p class="consulta-api-descricao">
      Consulte os itens disponibilizados pela API configurada
      para o conjunto selecionado.
    </p>

    <button
      type="button"
      class="consulta-api-botao"
      :disabled="
        desabilitado ||
        consultando ||
        conjuntoId == null ||
        conjuntoId === ''
      "
      @click="consultar"
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
        <path d="M20 7v5h-5" />
        <path d="M4 17v-5h5" />
        <path d="M6.1 7a7 7 0 0 1 11.6-2L20 8" />
        <path d="M4 16l2.3 3A7 7 0 0 0 17.9 17" />
      </svg>

      {{
        consultando
          ? 'Consultando API...'
          : erro
            ? 'Tentar novamente'
            : 'Consultar disponibilidade'
      }}
    </button>

    <p
      v-if="conjuntoId == null || conjuntoId === ''"
      class="consulta-api-ajuda"
    >
=======
    :aria-busy="carregando"
  >
    <header class="consulta-api-cabecalho">
      <div>
        <h3 id="consulta-api-titulo">
          Consultar dados disponíveis
        </h3>

        <p class="consulta-api-descricao">
          Consulte os itens disponibilizados para o conjunto.
        </p>
      </div>

      <button
        type="button"
        class="consulta-api-botao"
        :disabled="!podeConsultar"
        @click="consultar"
      >
        {{
          carregando
            ? 'Consultando API...'
            : falhou
              ? 'Tentar novamente'
              : 'Consultar disponibilidade'
        }}
      </button>
    </header>

    <p v-if="!temConjunto" class="consulta-api-ajuda">
>>>>>>> cba4571be93906c02346280169a1428756bbb4f0
      Selecione uma fonte e um conjunto para continuar.
    </p>

    <p
<<<<<<< HEAD
      v-if="consultando"
      class="consulta-api-ajuda"
      role="status"
    >
      Aguarde a resposta do backend.
    </p>

    <p
      v-if="concluida"
      class="consulta-api-sucesso"
      role="status"
    >
      Consulta concluída pelo backend.
    </p>

    <p
      v-if="erro"
      class="consulta-api-erro"
      role="alert"
    >
      {{ erro }}
    </p>
=======
      v-else-if="carregando"
      class="consulta-api-ajuda"
      role="status"
    >
      Consultando os dados disponíveis...
    </p>

    <template v-if="consultado">
      <p
        v-if="!itens.length"
        class="consulta-api-estado"
        role="status"
      >
        Nenhum item disponível para este conjunto.
      </p>

      <template v-else>
        <p class="consulta-api-contagem" role="status">
          {{ itens.length }} item(ns) encontrado(s).
        </p>

        <ul class="consulta-api-lista">
          <li
            v-for="item in itens"
            :key="item.identificador"
            class="consulta-api-item"
          >
            <label>
              <input
                type="checkbox"
                :checked="estaSelecionado(item)"
                :disabled="
                  bloqueado ||
                  carregando ||
                  item.jaRecebido
                "
                @change="alternarSelecao(item)"
              />

              <span>{{ item.nome || item.identificador }}</span>
            </label>

            <span class="consulta-api-observacao">
              {{
                item.jaRecebido
                  ? 'Já recebido no datalake'
                  : item.descricao
              }}
            </span>
          </li>
        </ul>

        <p class="consulta-api-ajuda">
          {{ selecionados.length }} item(ns) selecionado(s).
          Use o botão de importação para enviar.
        </p>
      </template>
    </template>
>>>>>>> cba4571be93906c02346280169a1428756bbb4f0
  </section>
</template>

<style scoped src="../assets/css/consulta-api-ingestao.css"></style>
