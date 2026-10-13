<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

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

const versoes = computed(() => {
  const lista = props.indicador?.versoes

  if (!Array.isArray(lista)) return []

  return [...lista].sort(
    (a, b) =>
      String(b.criadaEm ?? '').localeCompare(
        String(a.criadaEm ?? ''),
      ),
  )
})

function identificadorVersao(versao) {
  return versao.id ?? versao.numero
}

function nomeVersao(versao) {
  if (versao.numero != null) {
    return `v${versao.numero}`
  }

  return versao.id != null ? String(versao.id) : '—'
}

function estaVigente(versao) {
  if (typeof versao.vigente === 'boolean') {
    return versao.vigente
  }

  if (props.indicador?.versaoVigente == null) return false

  return (
    String(props.indicador.versaoVigente) ===
    String(identificadorVersao(versao))
  )
}

function formatarData(valor) {
  if (!valor) return '—'

  const partes = String(valor).match(
    /^(\d{4})-(\d{2})-(\d{2})/,
  )

  if (!partes) return '—'

  return `${partes[3]}/${partes[2]}/${partes[1]}`
}

function rotaDetalhe(versao) {
  return {
    name: 'RegraDetalheVersao',
    query: {
      indicador: props.indicador.id,
      versao: String(identificadorVersao(versao)),
    },
  }
}
</script>

<template>
  <section
    class="regras-historico"
    aria-labelledby="titulo-historico-versoes"
    :aria-busy="carregando"
  >
    <div class="regras-historico-cabecalho">
      <h3
        id="titulo-historico-versoes"
        class="regras-secao-titulo"
      >
        Histórico de versões
      </h3>

      <RouterLink
        v-if="
          indicador &&
          !carregando &&
          !erro &&
          versoes.length > 1
        "
        :to="{
          name: 'RegraCompararVersoes',
          query: { indicador: indicador.id },
        }"
        class="regras-botao"
      >
        Comparar versões
      </RouterLink>
    </div>

    <p
      v-if="carregando"
      class="regras-texto-secundario"
      role="status"
    >
      Carregando histórico de versões...
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

    <p
      v-else-if="!indicador"
      class="regras-texto-secundario"
    >
      Selecione um indicador para consultar o histórico.
    </p>

    <p
      v-else-if="!versoes.length"
      class="regras-texto-secundario"
    >
      Nenhuma versão carregada.
    </p>

    <ul v-else class="regras-historico-lista">
      <li
        v-for="versao in versoes"
        :key="identificadorVersao(versao)"
      >
        <RouterLink
          :to="rotaDetalhe(versao)"
          class="regras-versao"
        >
          <span class="regras-versao-numero">
            {{ nomeVersao(versao) }}
          </span>

          <span class="regras-versao-info">
            <strong>
              {{ indicador.codigo }} · {{ nomeVersao(versao) }}
            </strong>

            <small>
              Criada em {{ formatarData(versao.criadaEm) }}
              · {{ versao.autor || 'Autor não informado' }}
            </small>

            <span v-if="versao.inicio">
              Vigência: {{ formatarData(versao.inicio) }}

              <template v-if="versao.fim">
                até {{ formatarData(versao.fim) }}
              </template>
            </span>

            <span v-if="versao.motivo">
              {{ versao.motivo }}
            </span>

            <small v-if="versao.usos != null">
              Resultados vinculados: {{ versao.usos }}
            </small>
          </span>

          <span
            class="regras-etiqueta"
            :class="{
              'regras-etiqueta--vigente': estaVigente(versao),
            }"
          >
            {{ estaVigente(versao) ? 'Vigente' : 'Histórica' }}
          </span>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>

<style scoped src="../assets/css/regras.css"></style>
