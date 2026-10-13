<script setup>
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()

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

const emit = defineEmits(['tentar-novamente'])

function valorQuery(valor) {
  return Array.isArray(valor) ? valor[0] : valor
}

const indicadorCorreto = computed(() => {
  const id = valorQuery(route.query.indicador)

  return (
    props.indicador &&
    id != null &&
    String(props.indicador.id) === String(id)
  )
})

const versao = computed(() => {
  if (!indicadorCorreto.value) return null

  const id = valorQuery(route.query.versao)
  const versoes = props.indicador.versoes

  if (id == null || !Array.isArray(versoes)) return null

  return versoes.find(
    (item) => String(item.id ?? item.numero) === String(id),
  ) ?? null
})

const nomeVersao = computed(() => {
  if (!versao.value) return ''

  return versao.value.numero != null
    ? `v${versao.value.numero}`
    : String(versao.value.id)
})

const vigente = computed(() => {
  if (!versao.value) return null

  if (typeof versao.value.vigente === 'boolean') {
    return versao.value.vigente
  }

  if (props.indicador.versaoVigente == null) return null

  return (
    String(props.indicador.versaoVigente) ===
    String(versao.value.id ?? versao.value.numero)
  )
})

const parametros = computed(() =>
  Array.isArray(versao.value?.parametros)
    ? versao.value.parametros
    : [],
)

function definicaoParametro(parametro) {
  return props.indicador?.parametros?.find(
    (item) => item.id === parametro.id,
  )
}

function nomeParametro(parametro) {
  return (
    parametro.nome ||
    definicaoParametro(parametro)?.nome ||
    parametro.id
  )
}

function formatarData(valor) {
  if (!valor) return '—'

  const partes = String(valor).match(
    /^(\d{4})-(\d{2})-(\d{2})/,
  )

  return partes
    ? `${partes[3]}/${partes[2]}/${partes[1]}`
    : '—'
}

function formatarValor(parametro) {
  const valor = parametro.valor

  if (valor == null || valor === '') return '—'

  const definicao = definicaoParametro(parametro)
  const tipo = parametro.tipo ?? definicao?.tipo
  const unidade = parametro.unidade ?? definicao?.unidade

  if (tipo === 'data') {
    return formatarData(valor)
  }

  const numero = Number(valor)
  const texto = Number.isFinite(numero)
    ? numero.toLocaleString('pt-BR')
    : String(valor)

  return `${texto}${unidade ? ` ${unidade}` : ''}`
}

const mensagemVazia = computed(() => {
  if (!indicadorCorreto.value) {
    return (
      'Os dados do indicador não estão disponíveis. ' +
      'Volte à tela de regras e selecione o indicador.'
    )
  }

  return 'A versão solicitada não está disponível nos dados carregados.'
})
</script>

<template>
  <Teleport to="body">
    <div class="regras-overlay">
      <section
        class="regras-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-modal-versao"
        :aria-busy="carregando"
      >
        <RouterLink
          :to="{ name: 'Regras' }"
          class="regras-modal-fechar"
          aria-label="Fechar"
        >
          ×
        </RouterLink>

        <h2 id="titulo-modal-versao">
          Detalhes da versão
        </h2>

        <p
          v-if="carregando"
          class="regras-texto-secundario"
          role="status"
        >
          Carregando os detalhes da versão...
        </p>

        <div v-else-if="erro" role="alert">
          <p class="regras-erro">
            {{ erro }}
          </p>

          <button
            type="button"
            class="regras-botao"
            @click="emit('tentar-novamente')"
          >
            Tentar novamente
          </button>
        </div>

        <template v-else-if="versao">
          <p class="regras-texto-secundario">
            {{ indicador.codigo }} · {{ indicador.nome }}
            · {{ nomeVersao }}
          </p>

          <span
            v-if="vigente !== null"
            class="regras-etiqueta"
            :class="{
              'regras-etiqueta--vigente': vigente,
            }"
          >
            {{ vigente ? 'Vigente' : 'Histórica' }}
          </span>

          <dl class="regras-metadados">
            <div>
              <dt>Versão</dt>
              <dd>{{ nomeVersao }}</dd>
            </div>

            <div>
              <dt>Criada em</dt>
              <dd>{{ formatarData(versao.criadaEm) }}</dd>
            </div>

            <div>
              <dt>Autor</dt>
              <dd>{{ versao.autor || 'Não informado' }}</dd>
            </div>

            <div>
              <dt>Início da vigência</dt>
              <dd>{{ formatarData(versao.inicio) }}</dd>
            </div>

            <div>
              <dt>Fim da vigência</dt>
              <dd>
                {{
                  versao.fim
                    ? formatarData(versao.fim)
                    : vigente === true
                      ? 'Em vigor'
                      : '—'
                }}
              </dd>
            </div>

            <div>
              <dt>Resultados vinculados</dt>
              <dd>{{ versao.usos ?? '—' }}</dd>
            </div>
          </dl>

          <h3 class="regras-secao-titulo">
            Parâmetros desta versão
          </h3>

          <template v-if="parametros.length">
            <div
              v-for="parametro in parametros"
              :key="parametro.id"
              class="regras-resumo-parametro"
            >
              <span>{{ nomeParametro(parametro) }}</span>
              <strong>{{ formatarValor(parametro) }}</strong>
            </div>
          </template>

          <p
            v-else-if="indicador.possuiParametros === false"
            class="regras-aviso-consulta"
          >
            Este indicador não possui parâmetros configuráveis.
          </p>

          <p v-else class="regras-texto-secundario">
            Os parâmetros desta versão não foram carregados.
          </p>

          <details
            v-if="versao.formula"
            class="regras-calculo"
          >
            <summary class="regras-formula-botao">
              <span>Método de cálculo desta versão</span>

              <svg
                class="regras-formula-seta"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </summary>

            <div class="regras-formula">
              {{ versao.formula }}
            </div>
          </details>

          <h3 class="regras-secao-titulo">
            Motivo da alteração
          </h3>

          <p class="regras-texto-secundario">
            {{ versao.motivo || 'Não informado.' }}
          </p>
        </template>

        <p v-else class="regras-texto-secundario">
          {{ mensagemVazia }}
        </p>

        <div class="regras-acoes">
          <RouterLink
            :to="{ name: 'Regras' }"
            class="regras-botao"
          >
            Fechar
          </RouterLink>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped src="../assets/css/regras.css"></style>
