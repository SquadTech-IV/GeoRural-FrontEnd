<script setup>
import {
  computed,
  onBeforeUnmount,
  ref,
  watch,
} from 'vue'

import {
  consultaIngestaoCancelada,
  ingestaoService,
} from '../services/ingestaoService'

defineOptions({
  name: 'ConsultaApiIngestao',
})

const props = defineProps({
  conjuntoId: {
    type: [String, Number],
    default: null,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  desabilitado: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'consultado',
  'selecionar',
  'limpar',
  'erro',
])

const carregando = ref(false)
const consultado = ref(false)
const resposta = ref(null)
const selecionados = ref([])
const mensagemErro = ref('')

let consulta = null
let destruido = false

const bloqueado = computed(
  () => props.disabled || props.desabilitado,
)

const temConjunto = computed(
  () => String(props.conjuntoId ?? '').trim() !== '',
)

const podeConsultar = computed(
  () =>
    !bloqueado.value &&
    !carregando.value &&
    temConjunto.value,
)

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

function identificador(item) {
  if (item && typeof item === 'object') {
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

function alternarSelecao(indice) {
  if (
    bloqueado.value ||
    carregando.value ||
    identificador(itens.value[indice]) === null
  ) {
    return
  }

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

  emit(
    'selecionar',
    selecionados.value.map(
      atual => itens.value[atual],
    ),
  )
}

function limparResultado() {
  consultado.value = false
  resposta.value = null
  selecionados.value = []
  mensagemErro.value = ''

  emit('selecionar', [])
  emit('limpar')
}

function limparConsulta() {
  consulta?.abort()
  consulta = null
  carregando.value = false

  limparResultado()
}

async function consultar() {
  if (!podeConsultar.value || destruido) return

  consulta?.abort()

  const atual = new AbortController()
  const conjuntoId = props.conjuntoId

  consulta = atual
  carregando.value = true

  limparResultado()

  try {
    const dados =
      await ingestaoService.consultarDisponiveis(
        conjuntoId,
        { signal: atual.signal },
      )

    if (
      destruido ||
      atual.signal.aborted ||
      consulta !== atual ||
      props.conjuntoId !== conjuntoId
    ) {
      return
    }

    resposta.value = dados
    consultado.value = true

    emit('consultado', {
      conjuntoId,
      resposta: dados,
    })
  } catch (falha) {
    if (
      destruido ||
      atual.signal.aborted ||
      consulta !== atual ||
      props.conjuntoId !== conjuntoId ||
      consultaIngestaoCancelada(falha)
    ) {
      return
    }

    mensagemErro.value =
      falha?.message ||
      'Não foi possível consultar a API.'

    emit('erro', mensagemErro.value)
  } finally {
    if (!destruido && consulta === atual) {
      carregando.value = false
      consulta = null
    }
  }
}

watch(
  () => props.conjuntoId,
  limparConsulta,
  { flush: 'sync' },
)

onBeforeUnmount(() => {
  destruido = true
  consulta?.abort()
  consulta = null
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

        <p class="consulta-api-descricao">
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
            ? 'Consultando API...'
            : mensagemErro
              ? 'Tentar novamente'
              : 'Consultar disponibilidade'
        }}
      </button>
    </header>

    <p
      v-if="!temConjunto"
      class="consulta-api-ajuda"
    >
      Selecione uma fonte e um conjunto para continuar.
    </p>

    <p
      v-else-if="carregando"
      class="consulta-api-ajuda"
      role="status"
    >
      Consultando os dados disponíveis...
    </p>

    <p
      v-if="mensagemErro"
      class="consulta-api-erro"
      role="alert"
    >
      {{ mensagemErro }}
    </p>

    <template v-if="consultado">
      <p
        class="consulta-api-sucesso"
        role="status"
      >
        Consulta concluída pelo backend.
      </p>

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
                  bloqueado ||
                  carregando ||
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