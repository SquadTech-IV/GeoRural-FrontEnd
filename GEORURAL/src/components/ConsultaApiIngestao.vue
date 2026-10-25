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

defineOptions({ name: 'ConsultaApiIngestao' })

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
    ) {
      return
    }

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
      Selecione uma fonte e um conjunto para continuar.
    </p>

    <p
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
  </section>
</template>

<style scoped src="../assets/css/consulta-api-ingestao.css"></style>
