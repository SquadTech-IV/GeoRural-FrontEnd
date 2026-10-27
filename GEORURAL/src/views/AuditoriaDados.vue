<script setup>
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'

import BarraNavegacao from '../components/BarraNavegacao.vue'
import ToastMensagem from '../components/ToastMensagem.vue'
import ArquivosOrigemAuditoria from '../components/ArquivosOrigemAuditoria.vue'
import LinhaTempoExecucao from '../components/LinhaTempoExecucao.vue'
import DetalheExecucaoAuditoria from '../components/DetalheExecucaoAuditoria.vue'

import {
  criarConsultaAuditoria,
} from '../services/auditoriaConsultaService'

import {
  auditoriaService,
  requisicaoAuditoriaCancelada,
} from '../services/auditoriaService'

defineOptions({
  name: 'AuditoriaDadosPagina',
})

const {
  busca,
  indicador,
  indicadores,
  resultadosFiltrados,
  selecionado,
  carregando,
  falhou,
  consultado,
  mensagem,
  listaParcial,
  consultar,
  selecionar,
  fecharMensagem,
  destruir,
} = criarConsultaAuditoria()

const trilha = ref(null)
const carregandoTrilha = ref(false)
const falhouTrilha = ref(false)

let consultaTrilha = null
let destruido = false

const dadosExecucao = computed(() => {
  if (!trilha.value) return null

  const execucao = trilha.value.execucao ?? trilha.value

  return {
    ...execucao,
    eventos:
      trilha.value.eventos ??
      trilha.value.etapas ??
      execucao.eventos ??
      execucao.etapas,
  }
})

const execucaoSelecionada = computed(() =>
  trilha.value?.execucao?.id ??
  trilha.value?.execucaoId ??
  selecionado.value?.original?.execucaoId ??
  selecionado.value?.original?.execucao?.id ??
  null,
)

const regra = computed(() =>
  trilha.value?.regraCalculo ??
  trilha.value?.regra ??
  null,
)

const transformacoes = computed(() => {
  const dados = trilha.value?.transformacoes

  return Array.isArray(dados) ? dados : []
})

function exibirErro(erro) {
  if (destruido) return

  mensagem.value =
    typeof erro === 'string'
      ? erro
      : erro?.message || 'Não foi possível concluir a consulta.'
}

async function carregarTrilha() {
  consultaTrilha?.abort()
  consultaTrilha = null

  trilha.value = null
  falhouTrilha.value = false
  carregandoTrilha.value = false

  if (!selecionado.value || destruido) return

  const atual = new AbortController()
  consultaTrilha = atual
  carregandoTrilha.value = true

  try {
    const dados = await auditoriaService.consultarLinhagem(
      selecionado.value.id,
      { signal: atual.signal },
    )

    if (
      !destruido &&
      !atual.signal.aborted &&
      consultaTrilha === atual
    ) {
      trilha.value = dados
    }
  } catch (erro) {
    if (
      !destruido &&
      !atual.signal.aborted &&
      consultaTrilha === atual &&
      !requisicaoAuditoriaCancelada(erro)
    ) {
      falhouTrilha.value = true
      exibirErro(erro)
    }
  } finally {
    if (!destruido && consultaTrilha === atual) {
      carregandoTrilha.value = false
      consultaTrilha = null
    }
  }
}

function texto(valor) {
  if (valor == null || valor === '') {
    return 'Não informado'
  }

  return String(valor)
}

watch(selecionado, carregarTrilha, {
  immediate: true,
})

onMounted(consultar)

onBeforeUnmount(() => {
  destruido = true
  consultaTrilha?.abort()
  destruir()
})
</script>

<template>
  <div class="auditoria-layout">
    <BarraNavegacao />

    <main class="auditoria-pagina">
      <header class="auditoria-cabecalho">
        <div>
          <span class="auditoria-sobretitulo">
            Rastreabilidade
          </span>

          <h1>Linhagem e auditoria</h1>

          <p>
            Parta de um resultado e percorra a trilha
            até os arquivos de origem.
          </p>
        </div>

        <button
          type="button"
          class="auditoria-botao"
          :disabled="carregando"
          @click="consultar"
        >
          {{ carregando ? 'Consultando...' : 'Atualizar' }}
        </button>
      </header>

      <div class="auditoria-grade">
        <section
          class="auditoria-lista auditoria-painel"
          aria-labelledby="auditoria-lista-titulo"
          :aria-busy="carregando"
        >
          <header class="auditoria-lista-cabecalho">
            <h2 id="auditoria-lista-titulo">
              Resultados
            </h2>

            <span class="auditoria-contador">
              {{ resultadosFiltrados.length }}
            </span>
          </header>

          <div class="auditoria-filtros">
            <label class="auditoria-campo">
              <span>Buscar resultado</span>

              <input
                v-model="busca"
                type="search"
                placeholder="Digite um trecho do CAR"
              />
            </label>

            <label class="auditoria-campo">
              <span>Indicador</span>

              <select
                v-model="indicador"
                :disabled="carregando"
              >
                <option value="">
                  Todos os indicadores
                </option>

                <option
                  v-for="sigla in indicadores"
                  :key="sigla"
                  :value="sigla"
                >
                  {{ sigla }}
                </option>
              </select>
            </label>
          </div>

          <p
            v-if="carregando"
            class="auditoria-lista-estado"
            role="status"
          >
            Consultando resultados...
          </p>

          <div
            v-else-if="falhou"
            class="auditoria-lista-estado"
          >
            <button
              type="button"
              class="auditoria-botao"
              @click="consultar"
            >
              Tentar novamente
            </button>
          </div>

          <template v-else-if="consultado">
            <p
              v-if="!resultadosFiltrados.length"
              class="auditoria-lista-estado"
            >
              Nenhum resultado encontrado.
              Ajuste a busca ou o indicador.
            </p>

            <ul v-else class="auditoria-itens">
              <li
                v-for="item in resultadosFiltrados"
                :key="item.chave"
              >
                <button
                  type="button"
                  class="auditoria-item"
                  :class="{
                    'auditoria-item--ativo':
                      selecionado?.chave === item.chave,
                  }"
                  :aria-pressed="
                    selecionado?.chave === item.chave
                  "
                  @click="selecionar(item)"
                >
                  <span class="auditoria-item-texto">
                    <strong>{{ item.imovel }}</strong>

                    <span>
                      {{ item.indicador }}
                      · {{ item.valor ?? 'Não informado' }}
                    </span>

                    <small>
                      {{ item.car || 'CAR não informado' }}
                    </small>
                  </span>

                  <span class="auditoria-etiqueta">
                    {{ item.indicador }}
                  </span>
                </button>
              </li>
            </ul>

            <p
              v-if="listaParcial"
              class="auditoria-lista-aviso"
            >
              A API retornou uma página dos resultados.
              Os filtros são aplicados pelo servidor.
            </p>
          </template>
        </section>

        <section
          class="auditoria-detalhe auditoria-painel"
          aria-label="Trilha de auditoria do resultado"
          :aria-busy="carregandoTrilha"
        >
          <div
            v-if="!selecionado"
            class="auditoria-estado"
          >
            <span
              class="auditoria-vazio-icone"
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="6" cy="5" r="2" />
                <circle cx="18" cy="12" r="2" />
                <circle cx="6" cy="19" r="2" />
                <path d="M6 7v10M8 5h4a6 6 0 0 1 6 5" />
              </svg>
            </span>

            <h2>Selecione um resultado</h2>

            <p>
              Escolha um item da lista para consultar
              sua linhagem e os arquivos de origem.
            </p>
          </div>

          <template v-else>
            <header class="auditoria-detalhe-cabecalho">
              <div class="auditoria-detalhe-topo">
                <div>
                  <span class="auditoria-sobretitulo">
                    Resultado selecionado
                  </span>

                  <h2>{{ selecionado.imovel }}</h2>

                  <p class="auditoria-car">
                    CAR {{ selecionado.car || 'Não informado' }}
                  </p>
                </div>

                <span class="auditoria-etiqueta">
                  {{ selecionado.indicador }}
                </span>
              </div>

              <div class="auditoria-valor">
                <span>Resultado do indicador</span>

                <strong>
                  {{ selecionado.indicador }}
                  {{ selecionado.valor ?? 'Não informado' }}
                </strong>

                <p>
                  Valor informado pelo servidor
                  para o resultado selecionado.
                </p>
              </div>
            </header>

            <div
              v-if="carregandoTrilha"
              class="auditoria-estado"
              role="status"
            >
              <span
                class="auditoria-carregando"
                aria-hidden="true"
              ></span>

              <p>Consultando a trilha completa...</p>
            </div>

            <div
              v-else-if="falhouTrilha"
              class="auditoria-estado"
            >
              <h3>Trilha indisponível</h3>

              <button
                type="button"
                class="auditoria-botao"
                @click="carregarTrilha"
              >
                Tentar novamente
              </button>
            </div>

            <template v-else-if="trilha">
              <h3 class="auditoria-trilha-titulo">
                Trilha de auditoria — do resultado à origem
              </h3>

              <ol class="auditoria-trilha">
                <li class="auditoria-elo">
                  <span
                    class="auditoria-elo-icone"
                    aria-hidden="true"
                  >
                    ƒ
                  </span>

                  <details class="auditoria-elo-card">
                    <summary>
                      <span>
                        <strong>
                          Regra de cálculo aplicada
                        </strong>

                        <small>
                          {{
                            regra
                              ? texto(regra.nome ?? regra.versao)
                              : 'Detalhes não informados pela API'
                          }}
                        </small>
                      </span>

                      <span
                        class="auditoria-expandir"
                        aria-hidden="true"
                      >
                        +
                      </span>
                    </summary>

                    <div class="auditoria-elo-conteudo">
                      <template v-if="regra">
                        <p
                          v-if="regra.descricao"
                          class="auditoria-ajuda"
                        >
                          {{ regra.descricao }}
                        </p>

                        <dl class="auditoria-metadados">
                          <div>
                            <dt>Regra</dt>
                            <dd>{{ texto(regra.nome) }}</dd>
                          </div>

                          <div>
                            <dt>Versão</dt>
                            <dd>{{ texto(regra.versao) }}</dd>
                          </div>

                          <div v-if="regra.formula">
                            <dt>Fórmula</dt>
                            <dd>{{ regra.formula }}</dd>
                          </div>
                        </dl>
                      </template>

                      <p v-else class="auditoria-ajuda">
                        A consulta não forneceu os detalhes
                        da regra aplicada.
                      </p>
                    </div>
                  </details>
                </li>

                <li class="auditoria-elo">
                  <span
                    class="auditoria-elo-icone"
                    aria-hidden="true"
                  >
                    #
                  </span>

                  <details class="auditoria-elo-card">
                    <summary>
                      <span>
                        <strong>Execução do pipeline</strong>

                        <small>
                          {{
                            execucaoSelecionada != null
                              ? `Execução #${execucaoSelecionada}`
                              : 'Identificador não informado'
                          }}
                        </small>
                      </span>

                      <span
                        class="auditoria-expandir"
                        aria-hidden="true"
                      >
                        +
                      </span>
                    </summary>

                    <div class="auditoria-elo-conteudo">
                      <DetalheExecucaoAuditoria
                        :key="`detalhe-${selecionado.chave}`"
                        :dados="dadosExecucao"
                        :execucao-id="execucaoSelecionada"
                        @erro="exibirErro"
                      />
                    </div>
                  </details>
                </li>

                <li class="auditoria-elo">
                  <span
                    class="auditoria-elo-icone"
                    aria-hidden="true"
                  >
                    ⇄
                  </span>

                  <details class="auditoria-elo-card">
                    <summary>
                      <span>
                        <strong>Transformações aplicadas</strong>

                        <small>
                          {{
                            transformacoes.length
                              ? `${transformacoes.length} transformação(ões) informada(s)`
                              : 'Consultar transformações disponíveis'
                          }}
                        </small>
                      </span>

                      <span
                        class="auditoria-expandir"
                        aria-hidden="true"
                      >
                        +
                      </span>
                    </summary>

                    <div class="auditoria-elo-conteudo">
                      <ul
                        v-if="transformacoes.length"
                        class="auditoria-transformacoes"
                      >
                        <li
                          v-for="(item, indice) in transformacoes"
                          :key="item.id ?? indice"
                        >
                          <strong>
                            {{
                              item.nome ||
                              item.tipo ||
                              `Transformação ${indice + 1}`
                            }}
                          </strong>

                          <p v-if="item.descricao">
                            {{ item.descricao }}
                          </p>
                        </li>
                      </ul>

                      <p v-else class="auditoria-ajuda">
                        Nenhuma transformação detalhada
                        foi informada pela API.
                      </p>
                    </div>
                  </details>
                </li>

                <li class="auditoria-elo">
                  <span
                    class="auditoria-elo-icone"
                    aria-hidden="true"
                  >
                    ↧
                  </span>

                  <details class="auditoria-elo-card">
                    <summary>
                      <span>
                        <strong>Arquivos de origem</strong>

                        <small>
                          Consulte os arquivos utilizados
                          neste resultado.
                        </small>
                      </span>

                      <span
                        class="auditoria-expandir"
                        aria-hidden="true"
                      >
                        +
                      </span>
                    </summary>

                    <div class="auditoria-elo-conteudo">
                      <ArquivosOrigemAuditoria
                        :key="`origens-${selecionado.chave}`"
                        :dados="trilha"
                        :resultado-id="selecionado.id"
                        @erro="exibirErro"
                      />
                    </div>
                  </details>
                </li>

                <li class="auditoria-elo">
                  <span
                    class="auditoria-elo-icone"
                    aria-hidden="true"
                  >
                    ◷
                  </span>

                  <details class="auditoria-elo-card">
                    <summary>
                      <span>
                        <strong>Linha do tempo</strong>

                        <small>
                          Acompanhe os eventos registrados
                          na execução.
                        </small>
                      </span>

                      <span
                        class="auditoria-expandir"
                        aria-hidden="true"
                      >
                        +
                      </span>
                    </summary>

                    <div class="auditoria-elo-conteudo">
                      <LinhaTempoExecucao
                        :key="`execucao-${selecionado.chave}`"
                        :dados="dadosExecucao"
                        :execucao-id="execucaoSelecionada"
                        @erro="exibirErro"
                      />
                    </div>
                  </details>
                </li>
              </ol>
            </template>

            <p v-else class="auditoria-ajuda">
              Nenhuma trilha foi retornada para este resultado.
            </p>
          </template>
        </section>
      </div>
    </main>

    <ToastMensagem
      v-if="mensagem"
      :mensagem="mensagem"
      tipo="erro"
      :duracao="0"
      @fechar="fecharMensagem"
    />
  </div>
</template>

<style scoped src="../assets/css/auditoria-dados.css"></style>
