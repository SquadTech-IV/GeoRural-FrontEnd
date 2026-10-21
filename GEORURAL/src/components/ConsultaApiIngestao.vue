<script setup>
import {
  computed,
  onBeforeUnmount,
  ref,
  watch,
} from 'vue'

import {
  ingestaoService,
  consultaIngestaoCancelada,
} from '../services/ingestaoService'

defineOptions({
  name: 'ConsultaApiIngestao',
})

const props = defineProps({
  conjuntoId: {
    type: [String, Number],
    default: '',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'consultado',
  'selecionar',
  'erro',
])

const carregando = ref(false)
const consultado = ref(false)
const resposta = ref(null)
const selecionados = ref([])

let consulta = null
let destruido = false

const itens = computed(() => {
  if (Array.isArray(resposta.value)) {
    return resposta.value
  }

  if (Array.isArray(resposta.value?.itens)) {
    return resposta.value.itens
  }

  if (Array.isArray(resposta.value?.content)) {
    return resposta.value.content
  }

  return []
})

const podeConsultar = computed(() =>
  !props.disabled &&
  !carregando.value &&
  String(props.conjuntoId ?? '').trim() !== '',
)

function identificador(item) {
  if (
    item &&
    typeof item === 'object'
  ) {
    return item.id ?? item.codigo ?? item.url ?? null
  }

  return typeof item === 'string' ||
    typeof item === 'number'
    ? item
    : null
}

function nomeItem(item, indice) {
  if (
    typeof item === 'string' ||
    typeof item === 'number'
  ) {
    return String(item)
  }

  return (
    item?.nome ??
    item?.nomeArquivo ??
    item?.titulo ??
    `Item ${indice + 1}`
  )
}

function estaSelecionado(indice) {
  return selecionados.value.includes(indice)
}

function notificarSelecao() {
  emit(
    'selecionar',
    selecionados.value.map(indice => itens.value[indice]),
  )
}

function alternarSelecao(indice) {
  if (props.disabled || carregando.value) return

  if (estaSelecionado(indice)) {
    selecionados.value = selecionados.value.filter(
      atual => atual !== indice,
    )
  } else {
    selecionados.value = [
      ...selecionados.value,
      indice,
    ]
  }

  notificarSelecao()
}

function limpar() {
  consulta?.abort()
  consulta = null

  carregando.value = false
  consultado.value = false
  resposta.value = null
  selecionados.value = []

  emit('selecionar', [])
}

async function consultar() {
  if (!podeConsultar.value || destruido) return

  consulta?.abort()

  const atual = new AbortController()
  consulta = atual

  carregando.value = true
  consultado.value = false
  resposta.value = null
  selecionados.value = []

  emit('selecionar', [])

  try {
    const dados =
      await ingestaoService.consultarDisponiveis(
        props.conjuntoId,
        { signal: atual.signal },
      )

    if (
      destruido ||
      atual.signal.aborted ||
      consulta !== atual
    ) {
      return
    }

    resposta.value = dados
    consultado.value = true

    emit('consultado', dados)
  } catch (erro) {
    if (
      destruido ||
      atual.signal.aborted ||
      consulta !== atual ||
      consultaIngestaoCancelada(erro)
    ) {
      return
    }

    emit(
      'erro',
      erro?.message ||
        'Não foi possível consultar a API.',
    )
  } finally {
    if (!destruido && consulta === atual) {
      carregando.value = false
      consulta = null
    }
  }
}

watch(
  () => props.conjuntoId,
  limpar,
)

onBeforeUnmount(() => {
  destruido = true
  consulta?.abort()
})
</script>

<template>
  <section
    class="consulta-api"
    aria-labelledby="consulta-api-titulo"
    :aria-busy="carregando"
  >
    <header class="consulta-api-cabecalho">
      <div>
        <h3 id="consulta-api-titulo">
          Consultar dados disponíveis
        </h3>

        <p>
          Consulte os itens disponibilizados pela API
          do conjunto selecionado.
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
            ? 'Consultando...'
            : 'Consultar API'
        }}
      </button>
    </header>

    <p
      v-if="!conjuntoId"
      class="consulta-api-estado"
    >
      Selecione um conjunto para consultar a API.
    </p>

    <p
      v-else-if="carregando"
      class="consulta-api-estado"
      role="status"
    >
      Consultando os dados disponíveis...
    </p>

    <template v-else-if="consultado">
      <p
        v-if="!itens.length"
        class="consulta-api-estado"
        role="status"
      >
        A resposta recebida não contém uma lista de
        itens reconhecida para seleção.
      </p>

      <template v-else>
        <p
          class="consulta-api-contagem"
          role="status"
        >
          {{ itens.length }}
          {{
            itens.length === 1
              ? 'item disponível'
              : 'itens disponíveis'
          }}
        </p>

        <ul class="consulta-api-lista">
          <li
            v-for="(item, indice) in itens"
            :key="indice"
            class="consulta-api-item"
          >
            <label>
              <input
                type="checkbox"
                :checked="estaSelecionado(indice)"
                :disabled="
                  disabled ||
                  identificador(item) === null
                "
                @change="alternarSelecao(indice)"
              />

              <span>
                {{ nomeItem(item, indice) }}
              </span>
            </label>

            <span
              v-if="identificador(item) === null"
              class="consulta-api-observacao"
            >
              Sem identificador para seleção
            </span>
          </li>
        </ul>

        <p class="consulta-api-ajuda">
          {{ selecionados.length }}
          {{
            selecionados.length === 1
              ? 'item selecionado.'
              : 'itens selecionados.'
          }}
          A consulta não realiza a importação.
        </p>
      </template>
    </template>
  </section>
</template>

<style scoped src="../assets/css/consulta-api-ingestao.css"></style>
