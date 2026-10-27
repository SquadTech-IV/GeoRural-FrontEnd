<script setup>
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'

import { useRoute } from 'vue-router'

import BarraNavegacao from '../components/BarraNavegacao.vue'
import FluxoPublicacaoVersao from '../components/FluxoPublicacaoVersao.vue'
import ToastMensagem from '../components/ToastMensagem.vue'

import {
  prepararConferenciaResultados,
} from '../services/conferenciaResultadosService'

import {
  criarControleQualidade,
} from '../services/qualidadeControleService'

defineOptions({
  name: 'QualidadeDadosPagina',
})

const route = useRoute()

const {
  versoes,
  carregandoVersoes,
  carregarVersoes,
  execucaoId,
  versaoId,
  motivoReprovacao,
  resultado,
  versaoSelecionada,
  versaoConfirmada,
  carregando,
  publicando,
  reprovando,
  ocupado,
  falhouConferencia,
  notificacoes,
  fechar,
  selecionarExecucao,
  selecionarVersao,
  consultar,
  publicar,
  registrarReprovacao,
  destruir,
} = criarControleQualidade()

const aba = ref('conferir')
const busca = ref('')

const conferencia = computed(() =>
  prepararConferenciaResultados(resultado.value),
)

const notificacaoAtual = computed(() =>
  notificacoes.value[0] ?? null,
)

function publicada(versao) {
  return ['VIGENTE', 'ANTERIOR'].includes(
    String(versao?.situacao ?? '').toUpperCase(),
  )
}

const paraConferir = computed(() =>
  versoes.value.filter(versao => !publicada(versao)),
)

const publicadas = computed(() =>
  versoes.value.filter(publicada),
)

const lista = computed(() => {
  const origem = aba.value === 'publicadas'
    ? publicadas.value
    : paraConferir.value

  const texto = busca.value.trim().toLocaleLowerCase('pt-BR')

  if (!texto) return origem

  return origem.filter(versao =>
    [
      versao.conjuntoNome,
      versao.numero,
      versao.execucaoId,
      versao.competencia,
      versao.situacao,
    ].some(valor =>
      String(valor ?? '')
        .toLocaleLowerCase('pt-BR')
        .includes(texto),
    ),
  )
})

const itemSelecionado = computed(() =>
  versoes.value.find(
    versao => String(versao.id) === String(versaoId.value),
  ) ?? versaoSelecionada.value,
)

const tituloSelecionado = computed(() =>
  itemSelecionado.value?.conjuntoNome ||
  (
    conferencia.value
      ? `Execução #${conferencia.value.execucaoId}`
      : 'Conferência da qualidade'
  ),
)

const estaPublicada = computed(() =>
  publicada(itemSelecionado.value),
)

function formatarData(valor) {
  if (!valor) return 'Não informada'

  const data = new Date(valor)

  return Number.isNaN(data.getTime())
    ? String(valor)
    : data.toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
}

function fecharNotificacao() {
  if (notificacaoAtual.value) {
    fechar(notificacaoAtual.value.id)
  }
}

async function abrirVersao(versao) {
  if (ocupado.value) return

  selecionarVersao(String(versao.id))

  selecionarExecucao(
    versao.execucaoId == null
      ? ''
      : String(versao.execucaoId),
  )

  if (versao.execucaoId != null) {
    await consultar()
  }
}

function classeRegra(regra) {
  return String(regra.severidade ?? '')
    .toUpperCase() === 'AVISO'
    ? 'aviso'
    : 'erro'
}

watch(
  [
    () => route.query.execucaoId,
    () => route.query.versaoId,
  ],
  ([execucao, versao]) => {
    if (ocupado.value) return

    selecionarExecucao(
      typeof execucao === 'string' ? execucao : '',
    )

    selecionarVersao(
      typeof versao === 'string' ? versao : '',
    )

    if (execucaoId.value) {
      consultar()
    }
  },
  { immediate: true },
)

onMounted(carregarVersoes)
onBeforeUnmount(destruir)
</script>

<template>
  <div class="qualidade-layout">
    <BarraNavegacao />

    <main class="qualidade-pagina">
      <header class="qualidade-cabecalho">
        <div>
          <span class="qualidade-sobretitulo">
            Data Lake
          </span>

          <h1>Qualidade e publicação</h1>

          <p>
            Confira a qualidade das execuções e publique
            as versões aprovadas.
          </p>
        </div>

        <button
          type="button"
          class="qualidade-botao"
          :disabled="carregandoVersoes || ocupado"
          @click="carregarVersoes"
        >
          {{
            carregandoVersoes
              ? 'Atualizando...'
              : 'Atualizar versões'
          }}
        </button>
      </header>

      <div class="qualidade-grade">
        <aside
          class="qualidade-lista qualidade-painel"
          aria-label="Versões para conferência e publicadas"
        >
          <div class="qualidade-abas">
            <button
              type="button"
              class="qualidade-aba"
              :class="{
                'qualidade-aba--ativa': aba === 'conferir',
              }"
              :aria-pressed="aba === 'conferir'"
              @click="aba = 'conferir'"
            >
              Para conferir
              <span>{{ paraConferir.length }}</span>
            </button>

            <button
              type="button"
              class="qualidade-aba"
              :class="{
                'qualidade-aba--ativa': aba === 'publicadas',
              }"
              :aria-pressed="aba === 'publicadas'"
              @click="aba = 'publicadas'"
            >
              Publicadas
              <span>{{ publicadas.length }}</span>
            </button>
          </div>

          <div class="qualidade-busca">
            <input
              v-model="busca"
              type="search"
              aria-label="Buscar conjunto ou versão"
              placeholder="Buscar conjunto ou versão..."
            />
          </div>

          <p
            v-if="carregandoVersoes"
            class="qualidade-lista-estado"
            role="status"
          >
            Carregando versões...
          </p>

          <p
            v-else-if="!lista.length"
            class="qualidade-lista-estado"
          >
            {{
              busca
                ? 'Nenhum resultado para esta busca.'
                : aba === 'publicadas'
                  ? 'Nenhuma versão publicada disponível.'
                  : 'Nenhuma versão disponível para conferência.'
            }}
          </p>

          <ul v-else class="qualidade-itens">
            <li v-for="versao in lista" :key="versao.id">
              <button
                type="button"
                class="qualidade-item"
                :class="{
                  'qualidade-item--ativo':
                    String(versaoId) === String(versao.id),
                }"
                :aria-pressed="
                  String(versaoId) === String(versao.id)
                "
                :disabled="ocupado"
                @click="abrirVersao(versao)"
              >
                <span class="qualidade-item-texto">
                  <strong>
                    {{ versao.conjuntoNome || 'Conjunto não informado' }}
                  </strong>

                  <span>
                    Versão {{ versao.numero ?? versao.id }}

                    <template v-if="versao.execucaoId != null">
                      · Execução #{{ versao.execucaoId }}
                    </template>
                  </span>

                  <small v-if="versao.competencia">
                    Competência {{ versao.competencia }}
                  </small>
                </span>

                <span
                  class="qualidade-selo"
                  :class="
                    publicada(versao)
                      ? 'qualidade-selo--publicada'
                      : 'qualidade-selo--neutro'
                  "
                >
                  {{ versao.situacao || 'Não informada' }}
                </span>
              </button>
            </li>
          </ul>

          <details class="qualidade-consulta-manual">
            <summary>Consultar por identificador</summary>

            <form @submit.prevent="consultar">
              <label for="qualidade-execucao">
                Execução
              </label>

              <input
                id="qualidade-execucao"
                :value="execucaoId"
                type="text"
                inputmode="numeric"
                required
                :disabled="ocupado"
                placeholder="Código da execução"
                @input="
                  selecionarExecucao($event.target.value)
                "
              />

              <label for="qualidade-versao">
                Versão
              </label>

              <input
                id="qualidade-versao"
                :value="versaoId"
                type="text"
                inputmode="numeric"
                :disabled="ocupado"
                placeholder="Código da versão"
                @input="
                  selecionarVersao($event.target.value)
                "
              />

              <button
                type="submit"
                class="qualidade-botao"
                :disabled="ocupado"
              >
                {{ carregando ? 'Consultando...' : 'Consultar qualidade' }}
              </button>
            </form>
          </details>
        </aside>

        <section
          class="qualidade-detalhe qualidade-painel"
          aria-label="Conferência da versão"
          :aria-busy="carregando"
        >
          <div
            v-if="carregando"
            class="qualidade-estado"
            role="status"
          >
            <span class="qualidade-carregando"></span>
            <p>Consultando resultados da validação...</p>
          </div>

          <div
            v-else-if="falhouConferencia"
            class="qualidade-estado"
          >
            <h2>Consulta indisponível</h2>

            <button
              type="button"
              class="qualidade-botao"
              :disabled="ocupado"
              @click="consultar"
            >
              Tentar novamente
            </button>
          </div>

          <template v-else>
            <header
              v-if="itemSelecionado || conferencia"
              class="qualidade-detalhe-cabecalho"
            >
              <h2>{{ tituloSelecionado }}</h2>

              <p>
                <template v-if="execucaoId">
                  Execução #{{ execucaoId }}
                </template>

                <template v-if="itemSelecionado">
                  · Versão
                  {{ itemSelecionado.numero ?? itemSelecionado.id }}
                </template>

                <template v-if="itemSelecionado?.competencia">
                  · Competência {{ itemSelecionado.competencia }}
                </template>
              </p>
            </header>

            <div
              v-if="estaPublicada"
              class="qualidade-publicada"
            >
              <strong>
                Versão {{ itemSelecionado.numero }}
                · {{ itemSelecionado.situacao }}
              </strong>

              <p>
                Publicada em
                {{ formatarData(itemSelecionado.dataPublicacao) }}.
              </p>
            </div>

            <template v-if="conferencia">
              <div
                class="qualidade-veredito"
                :class="
                  `qualidade-veredito--${conferencia.classeConclusao}`
                "
              >
                <span aria-hidden="true">●</span>

                <div>
                  <strong>{{ conferencia.conclusao }}</strong>
                  <p>{{ conferencia.statusValidacao }}</p>
                </div>
              </div>

              <dl class="qualidade-indicadores">
                <div
                  v-for="indicador in conferencia.indicadores"
                  :key="indicador.chave"
                  class="qualidade-indicador"
                  :class="
                    `qualidade-indicador--${indicador.classe}`
                  "
                >
                  <dd>{{ indicador.valor }}</dd>
                  <dt>{{ indicador.titulo }}</dt>
                </div>
              </dl>

              <div class="qualidade-aprovacao">
                <div>
                  <span>Percentual de aprovação</span>

                  <strong>
                    {{ conferencia.percentualFormatado }}
                  </strong>
                </div>

                <progress
                  v-if="conferencia.percentual !== null"
                  :value="conferencia.percentual"
                  max="100"
                  aria-label="Percentual de aprovação"
                >
                  {{ conferencia.percentualFormatado }}
                </progress>
              </div>

              <section class="qualidade-regras">
                <header class="qualidade-secao-cabecalho">
                  <h3>Regras violadas</h3>
                  <span>{{ conferencia.regras.length }}</span>
                </header>

                <p
                  v-if="!conferencia.regras.length"
                  class="qualidade-ajuda"
                >
                  Nenhuma regra violada informada pela API.
                </p>

                <ul v-else class="qualidade-regras-lista">
                  <li
                    v-for="(regra, indice) in conferencia.regras"
                    :key="indice"
                    class="qualidade-regra"
                  >
                    <span
                      class="qualidade-regra-icone"
                      :class="
                        `qualidade-regra-icone--${classeRegra(regra)}`
                      "
                      aria-hidden="true"
                    >
                      !
                    </span>

                    <div class="qualidade-regra-texto">
                      <strong>{{ regra.nome }}</strong>

                      <p>
                        {{ regra.tipo }}
                        · {{ regra.quantidade }} ocorrência(s)
                      </p>
                    </div>

                    <span
                      class="qualidade-selo"
                      :class="
                        `qualidade-selo--${classeRegra(regra)}`
                      "
                    >
                      {{ regra.severidade }}
                    </span>
                  </li>
                </ul>
              </section>

              <section
                v-if="conferencia.motivos.length"
                class="qualidade-motivos"
              >
                <h3>Motivos de reprovação</h3>

                <ul>
                  <li
                    v-for="(motivo, indice) in conferencia.motivos"
                    :key="indice"
                  >
                    {{ motivo }}
                  </li>
                </ul>
              </section>

              <div
                v-if="!estaPublicada"
                class="qualidade-acoes"
              >
                <FluxoPublicacaoVersao
                  :resultado="resultado"
                  :versao="versaoSelecionada"
                  :publicando="publicando || reprovando"
                  @confirmar="publicar"
                />
              </div>
            </template>

            <div
              v-else
              class="qualidade-estado"
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
                <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                <path d="M14 3v6h6M8 13h8M8 17h5" />
              </svg>

              <h2>
                {{
                  itemSelecionado
                    ? 'Qualidade não consultada'
                    : 'Selecione uma versão'
                }}
              </h2>

              <p>
                {{
                  itemSelecionado
                    ? 'Se a versão não possui execução informada, utilize a consulta por identificador.'
                    : 'Escolha uma versão à esquerda para conferir os resultados.'
                }}
              </p>
            </div>

            <div
              v-if="versaoConfirmada"
              class="qualidade-confirmacao"
              role="status"
            >
              <strong>Resposta confirmada pelo servidor</strong>

              <p>
                Versão {{ versaoConfirmada.numero }}
                · {{ versaoConfirmada.situacao }}
                · Execução
                {{ versaoConfirmada.execucaoId ?? 'Não informada' }}
              </p>
            </div>

            <details
              v-if="versaoId && !estaPublicada"
              class="qualidade-reprovacao"
            >
              <summary>
                Registrar justificativa de reprovação
              </summary>

              <form @submit.prevent="registrarReprovacao">
                <label for="qualidade-motivo">
                  Motivo
                </label>

                <textarea
                  id="qualidade-motivo"
                  v-model="motivoReprovacao"
                  required
                  rows="3"
                  :disabled="ocupado"
                  placeholder="Descreva o motivo da reprovação."
                />

                <p class="qualidade-ajuda">
                  A justificativa será registrada na auditoria.
                </p>

                <button
                  type="submit"
                  class="qualidade-botao"
                  :disabled="
                    ocupado ||
                    !String(versaoId ?? '').trim()
                  "
                >
                  {{
                    reprovando
                      ? 'Registrando...'
                      : 'Registrar justificativa'
                  }}
                </button>
              </form>
            </details>
          </template>
        </section>
      </div>
    </main>

    <ToastMensagem
      v-if="notificacaoAtual"
      :key="notificacaoAtual.id"
      :mensagem="notificacaoAtual.mensagem"
      :tipo="notificacaoAtual.tipo"
      :duracao="
        notificacaoAtual.tipo === 'erro' ? 0 : 6000
      "
      @fechar="fecharNotificacao"
    />
  </div>
</template>

<style scoped src="../assets/css/qualidade-dados.css"></style>
