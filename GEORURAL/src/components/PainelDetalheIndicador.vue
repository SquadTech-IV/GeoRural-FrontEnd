<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  indicador: {
    type: Object,
    default: null,
  },
  carregando: {
    type: Boolean,
    default: false,
  },
  erro: {
    type: String,
    default: '',
  },
})

const emit = defineEmits([
  'tentar-novamente',
  'salvar-nova-versao',
])

const valores = ref({})
const valoresOriginais = ref({})
const camposTocados = ref({})
const tentouSalvar = ref(false)

const titulo = computed(() => {
  if (!props.indicador) return 'Detalhes do indicador'

  return [
    props.indicador.codigo,
    props.indicador.nome,
  ]
    .filter(Boolean)
    .join(' · ')
})

const configuravel = computed(() => {
  if (!props.indicador) return null

  if (typeof props.indicador.possuiParametros === 'boolean') {
    return props.indicador.possuiParametros
  }

  if (Array.isArray(props.indicador.parametros)) {
    return props.indicador.parametros.length > 0
  }

  return null
})

const formula = computed(() => {
  const texto = props.indicador?.formula
  return typeof texto === 'string' ? texto.trim() : ''
})

const exemplo = computed(() => {
  const texto = props.indicador?.exemplo
  return typeof texto === 'string' ? texto.trim() : ''
})

const parametros = computed(() =>
  Array.isArray(props.indicador?.parametros)
    ? props.indicador.parametros
    : [],
)

function normalizarValor(valor) {
  return valor == null ? '' : String(valor).trim()
}

function carregarValores() {
  const iniciais = {}

  for (const parametro of parametros.value) {
    iniciais[parametro.id] = normalizarValor(parametro.valor)
  }

  valores.value = { ...iniciais }
  valoresOriginais.value = { ...iniciais }
  camposTocados.value = {}
  tentouSalvar.value = false
}

watch(
  () => props.indicador,
  carregarValores,
  { immediate: true, deep: true },
)

function dataValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false

  const [ano, mes, dia] = valor.split('-').map(Number)
  const data = new Date(0)

  data.setUTCHours(0, 0, 0, 0)
  data.setUTCFullYear(ano, mes - 1, dia)

  return (
    data.getUTCFullYear() === ano &&
    data.getUTCMonth() === mes - 1 &&
    data.getUTCDate() === dia
  )
}

function validarParametro(parametro) {
  const valor = normalizarValor(valores.value[parametro.id])

  if (!valor) {
    return parametro.obrigatorio === false
      ? ''
      : 'Preencha este campo.'
  }

  if (parametro.tipo === 'data') {
    if (!dataValida(valor)) {
      return 'Informe uma data válida.'
    }

    if (parametro.min && valor < parametro.min) {
      return 'A data está abaixo do limite permitido.'
    }

    if (parametro.max && valor > parametro.max) {
      return 'A data está acima do limite permitido.'
    }

    return ''
  }

  const numero = Number(valor)

  if (!Number.isFinite(numero)) {
    return 'Informe um número válido.'
  }

  if (
    parametro.tipo === 'percentual' &&
    (numero < 0 || numero > 100)
  ) {
    return 'O percentual deve estar entre 0 e 100.'
  }

  if (parametro.positivo && numero <= 0) {
    return 'O valor deve ser maior que zero.'
  }

  if (parametro.inteiro && !Number.isInteger(numero)) {
    return 'Informe um número inteiro.'
  }

  if (parametro.min != null && numero < Number(parametro.min)) {
    return `O valor mínimo permitido é ${parametro.min}.`
  }

  if (parametro.max != null && numero > Number(parametro.max)) {
    return `O valor máximo permitido é ${parametro.max}.`
  }

  return ''
}

const erros = computed(() =>
  Object.fromEntries(
    parametros.value.map((parametro) => [
      parametro.id,
      validarParametro(parametro),
    ]),
  ),
)

const possuiErros = computed(() =>
  Object.values(erros.value).some(Boolean),
)

function campoAlterado(parametro) {
  return (
    normalizarValor(valores.value[parametro.id]) !==
    valoresOriginais.value[parametro.id]
  )
}

const possuiAlteracoes = computed(() =>
  parametros.value.some(campoAlterado),
)

const podeSalvar = computed(() =>
  configuravel.value === true &&
  parametros.value.length > 0 &&
  possuiAlteracoes.value &&
  !possuiErros.value &&
  !props.carregando,
)

function mostrarErro(parametro) {
  return (
    (tentouSalvar.value || camposTocados.value[parametro.id]) &&
    Boolean(erros.value[parametro.id])
  )
}

function marcarCampo(parametro) {
  camposTocados.value[parametro.id] = true
}

function descartar() {
  valores.value = { ...valoresOriginais.value }
  camposTocados.value = {}
  tentouSalvar.value = false
}

function salvarNovaVersao() {
  tentouSalvar.value = true

  if (!podeSalvar.value) return

  emit('salvar-nova-versao', {
    indicadorId: props.indicador.id,
    parametros: parametros.value.map((parametro) => {
      const valor = normalizarValor(valores.value[parametro.id])

      return {
        id: parametro.id,
        valor:
          valor === ''
            ? null
            : parametro.tipo === 'data'
              ? valor
              : Number(valor),
      }
    }),
  })
}

function limiteMinimo(parametro) {
  return parametro.min ??
    (parametro.tipo === 'percentual' ? 0 : undefined)
}

function limiteMaximo(parametro) {
  return parametro.max ??
    (parametro.tipo === 'percentual' ? 100 : undefined)
}
</script>

<template>
  <section class="regras-detalhe" aria-labelledby="titulo-detalhe-indicador" :aria-busy="carregando">
    <header class="regras-detalhe-cabecalho">
      <div>
        <h2 id="titulo-detalhe-indicador">
          {{ titulo }}
        </h2>

        <p v-if="!indicador">
          Selecione um indicador para consultar suas informações.
        </p>

        <template v-else>
          <p v-if="indicador.descricao">
            {{ indicador.descricao }}
          </p>

          <small>
            Versão vigente:
            {{ indicador.versaoVigente ?? '—' }}
          </small>
        </template>
      </div>

      <span v-if="indicador && configuravel !== null" class="regras-etiqueta">
        {{ configuravel ? 'Configurável' : 'Consulta' }}
      </span>
    </header>

    <div v-if="carregando" class="painel-detalhe-estado" role="status">
      Carregando os detalhes do indicador...
    </div>

    <div v-else-if="erro" class="painel-detalhe-estado" role="alert">
      <p class="regras-erro">{{ erro }}</p>

      <button type="button" class="regras-botao" @click="emit('tentar-novamente')">
        Tentar novamente
      </button>
    </div>

    <p v-else-if="!indicador" class="regras-texto-secundario">
      Os detalhes serão apresentados após selecionar
      um indicador na lista.
    </p>

    <div v-else class="painel-detalhe-conteudo">
      <details :key="indicador.id" class="regras-calculo">
        <summary class="regras-formula-botao">
          <span>Como é calculado</span>

          <svg class="regras-formula-seta" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </summary>

        <div class="regras-calculo-conteudo">
          <div v-if="formula" class="regras-formula">
            {{ formula }}
          </div>

          <p v-else class="regras-texto-secundario">
            Nenhum método de cálculo carregado.
          </p>

          <p v-if="exemplo" class="regras-exemplo">
            <strong>Exemplo:</strong>
            {{ exemplo }}
          </p>
        </div>
      </details>

      <section class="regras-edicao">
        <template v-if="configuravel === true">
          <h3 class="regras-secao-titulo">
            Parâmetros
          </h3>

          <form v-if="parametros.length" novalidate @submit.prevent="salvarNovaVersao">
            <div v-for="parametro in parametros" :key="parametro.id" class="regras-parametro" :class="{
              'regras-parametro--erro': mostrarErro(parametro),
              'regras-parametro--alterado':
                campoAlterado(parametro) &&
                !mostrarErro(parametro),
            }">
              <div class="regras-parametro-info">
                <label :for="`parametro-${parametro.id}`">
                  {{ parametro.nome }}
                </label>

                <p v-if="parametro.descricao">
                  {{ parametro.descricao }}
                </p>

                <small v-if="mostrarErro(parametro)" :id="`erro-parametro-${parametro.id}`" class="regras-erro">
                  {{ erros[parametro.id] }}
                </small>
              </div>

              <div class="regras-parametro-valor">
                <input :id="`parametro-${parametro.id}`" v-model="valores[parametro.id]" :name="parametro.id" :type="parametro.tipo === 'data'
                    ? 'date'
                    : 'number'
                  " :min="limiteMinimo(parametro)" :max="limiteMaximo(parametro)" :step="parametro.tipo === 'data' || parametro.inteiro
                ? 1
                : 'any'
              " :required="parametro.obrigatorio !== false" :aria-invalid="Boolean(mostrarErro(parametro))"
                  :aria-describedby="mostrarErro(parametro)
                      ? `erro-parametro-${parametro.id}`
                      : undefined
                    " @blur="marcarCampo(parametro)" @input="marcarCampo(parametro)" />

                <span v-if="parametro.unidade">
                  {{ parametro.unidade }}
                </span>
              </div>
            </div>

            <p v-if="possuiAlteracoes" class="regras-aviso" role="status">
              Há alterações não salvas.
              Os valores vigentes ainda não foram modificados.
            </p>

            <div class="regras-acoes">
              <button type="button" class="regras-botao" :disabled="!possuiAlteracoes" @click="descartar">
                Descartar
              </button>

              <button type="submit" class="regras-botao regras-botao--principal" :disabled="!podeSalvar">
                Salvar como nova versão
              </button>
            </div>
          </form>

          <p v-else class="regras-texto-secundario">
            Nenhum parâmetro carregado.
          </p>
        </template>

        <p v-else-if="configuravel === false" class="regras-aviso-consulta">
          O {{ indicador.codigo }} é calculado sempre da mesma forma
          (a fórmula acima) —
          <strong>não existem valores que você precise definir</strong>,
          diferente do IRL ou do IDesmat, onde há percentuais e datas
          a ajustar.

          Nesta tela você pode <strong>consultar</strong> como ele
          funciona e ver o histórico de versões, mas não há campos
          para editar.
        </p>

        <p v-else class="regras-texto-secundario">
          Nenhuma informação sobre parâmetros carregada.
        </p>
      </section>
      <slot :indicador="indicador"></slot>
    </div>
  </section>
</template>

<style scoped src="../assets/css/regras.css"></style>
