<script setup>
import { computed, watch } from 'vue'

import BarraNavegacao from '../components/BarraNavegacao.vue'
import FluxoPublicacaoVersao from '../components/FluxoPublicacaoVersao.vue'
import ListaVersoesPublicadas from '../components/ListaVersoesPublicadas.vue'
import ToastMensagem from '../components/ToastMensagem.vue'

import {
  prepararConferenciaResultados,
} from '../services/conferenciaResultadosService'

import {
  criarFeedbackPublicacao,
} from '../services/publicacaoErroService'

const props = defineProps({
  resultado: {
    type: Object,
    default: null,
  },
  versao: {
    type: Object,
    default: null,
  },
  carregando: {
    type: Boolean,
    default: false,
  },
  publicando: {
    type: Boolean,
    default: false,
  },
  versoesPublicadas: {
    type: Array,
    default: () => [],
  },
  carregandoVersoes: {
    type: Boolean,
    default: false,
  },
  erroConferencia: {
    type: [Object, String],
    default: null,
  },
  erroPublicacao: {
    type: [Object, String],
    default: null,
  },
  erroVersoes: {
    type: [Object, String],
    default: null,
  },
})

const emit = defineEmits([
  'publicar',
  'tentar-conferencia',
  'tentar-versoes',
])

const {
  notificacoes,
  registrarErro,
  fechar,
} = criarFeedbackPublicacao()

const conferencia = computed(() =>
  prepararConferenciaResultados(props.resultado),
)

const notificacaoAtual = computed(() =>
  notificacoes.value[0] ?? null,
)

watch(
  () => props.erroConferencia,
  erro => registrarErro('conferencia', erro),
  { immediate: true },
)

watch(
  () => props.erroPublicacao,
  erro => registrarErro('publicacao', erro),
  { immediate: true },
)

watch(
  () => props.erroVersoes,
  erro => registrarErro('versoes', erro),
  { immediate: true },
)

function fecharNotificacao() {
  if (notificacaoAtual.value) {
    fechar(notificacaoAtual.value.id)
  }
}

function solicitarPublicacao(dados) {
  if (
    props.carregando ||
    props.publicando ||
    props.erroConferencia
  ) {
    return
  }

  emit('publicar', dados)
}
</script>

<template>
  <div class="qualidade-layout">
    <BarraNavegacao />

    <main class="qualidade-pagina">
      <header class="qualidade-cabecalho">
        <h1>Conferência dos resultados</h1>

        <p>
          Confira os resultados da validação e consulte
          o histórico de versões publicadas.
        </p>
      </header>

      <section
        v-if="carregando"
        class="qualidade-card qualidade-estado"
        aria-busy="true"
      >
        <p role="status">
          Carregando resultados da validação...
        </p>
      </section>

      <section
        v-else-if="erroConferencia"
        class="qualidade-card qualidade-estado"
      >
        <h2>Conferência dos resultados</h2>

        <button
          type="button"
          class="qualidade-tentar"
          @click="emit('tentar-conferencia')"
        >
          Tentar consultar resultados novamente
        </button>
      </section>

      <section
        v-else-if="!conferencia"
        class="qualidade-card qualidade-estado"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path
            d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"
          />
          <path d="M14 3v6h6M8 13h8M8 17h5" />
        </svg>

        <h2>Nenhum resultado disponível</h2>

        <p>
          Os resultados serão exibidos quando os dados
          da validação forem fornecidos à página.
        </p>
      </section>

      <template v-else>
        <section
          class="qualidade-card"
          aria-labelledby="qualidade-resumo-titulo"
        >
          <header class="qualidade-resumo-cabecalho">
            <div>
              <h2 id="qualidade-resumo-titulo">
                Resumo da validação
              </h2>

              <p>
                Execução {{ conferencia.execucaoId }}
              </p>
            </div>

            <span
              class="qualidade-selo"
              :class="`qualidade-selo--${conferencia.classeConclusao}`"
            >
              {{ conferencia.conclusao }}
            </span>
          </header>

          <dl class="qualidade-indicadores">
            <div
              v-for="indicador in conferencia.indicadores"
              :key="indicador.chave"
              class="qualidade-indicador"
              :class="`qualidade-indicador--${indicador.classe}`"
            >
              <dt>{{ indicador.titulo }}</dt>
              <dd>{{ indicador.valor }}</dd>
            </div>
          </dl>

          <div class="qualidade-aprovacao">
            <div class="qualidade-aprovacao-cabecalho">
              <h3>Percentual de aprovação</h3>

              <strong>
                {{ conferencia.percentualFormatado }}
              </strong>
            </div>

            <progress
              v-if="conferencia.percentual !== null"
              class="qualidade-progresso"
              :value="conferencia.percentual"
              max="100"
              aria-label="Percentual de aprovação dos registros"
            >
              {{ conferencia.percentualFormatado }}
            </progress>

            <p class="qualidade-ajuda">
              Situação informada:
              {{ conferencia.statusValidacao }}
            </p>
          </div>
        </section>

        <section
          class="qualidade-card"
          aria-labelledby="qualidade-regras-titulo"
        >
          <header class="qualidade-secao-cabecalho">
            <h2 id="qualidade-regras-titulo">
              Regras violadas
            </h2>

            <span>
              {{ conferencia.regras.length }} regra(s)
            </span>
          </header>

          <p
            v-if="!conferencia.regras.length"
            class="qualidade-lista-vazia"
          >
            Nenhuma regra violada informada nesta validação.
          </p>

          <div
            v-else
            class="qualidade-tabela-container"
            role="region"
            aria-label="Regras violadas na validação"
            tabindex="0"
          >
            <table class="qualidade-tabela">
              <caption class="qualidade-somente-leitor">
                Regras violadas e quantidade de ocorrências
              </caption>

              <thead>
                <tr>
                  <th scope="col">Regra</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Severidade</th>
                  <th scope="col">Ocorrências</th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="(regra, indice) in conferencia.regras"
                  :key="indice"
                >
                  <th scope="row">
                    {{ regra.nome }}
                  </th>

                  <td>{{ regra.tipo }}</td>

                  <td>
                    <span class="qualidade-severidade">
                      {{ regra.severidade }}
                    </span>
                  </td>

                  <td>{{ regra.quantidade }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section
          class="qualidade-card"
          aria-labelledby="qualidade-motivos-titulo"
        >
          <h2 id="qualidade-motivos-titulo">
            Motivos de reprovação
          </h2>

          <ul
            v-if="conferencia.motivos.length"
            class="qualidade-motivos"
          >
            <li
              v-for="(motivo, indice) in conferencia.motivos"
              :key="indice"
            >
              {{ motivo }}
            </li>
          </ul>

          <p v-else class="qualidade-lista-vazia">
            Nenhum motivo de reprovação informado.
          </p>
        </section>

        <FluxoPublicacaoVersao
          :resultado="resultado"
          :versao="versao"
          :publicando="publicando"
          @confirmar="solicitarPublicacao"
        />

        <p class="qualidade-observacao">
          A aprovação da validação permite solicitar a
          publicação. A versão somente deve ser apresentada
          como publicada após a confirmação do servidor.
        </p>
      </template>

      <section
        v-if="erroVersoes && !carregandoVersoes"
        class="qualidade-card qualidade-estado"
      >
        <h2>Versões publicadas</h2>

        <button
          type="button"
          class="qualidade-tentar"
          @click="emit('tentar-versoes')"
        >
          Tentar consultar versões novamente
        </button>
      </section>

      <ListaVersoesPublicadas
        v-else
        :versoes="versoesPublicadas"
        :carregando="carregandoVersoes"
      />
    </main>

    <ToastMensagem
      v-if="notificacaoAtual"
      :key="notificacaoAtual.id"
      :identificador="notificacaoAtual.id"
      :titulo="notificacaoAtual.titulo"
      :mensagem="notificacaoAtual.mensagem"
      tipo="erro"
      :duracao="0"
      @fechar="fecharNotificacao"
    />
  </div>
</template>

<style scoped src="../assets/css/qualidade-dados.css"></style>
