<script setup>
import {
  computed,
  onBeforeUnmount,
  onMounted,
  watch,
} from 'vue'

import { useRoute } from 'vue-router'

import BarraNavegacao from '../components/BarraNavegacao.vue'
import FluxoPublicacaoVersao from '../components/FluxoPublicacaoVersao.vue'
import ListaVersoesPublicadas from '../components/ListaVersoesPublicadas.vue'
import ToastMensagem from '../components/ToastMensagem.vue'

import {
  prepararConferenciaResultados,
} from '../services/conferenciaResultadosService'

import {
  criarControleQualidade,
} from '../services/qualidadeControleService'

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
  versoesPublicadas,
  notificacoes,
  fechar,
  selecionarExecucao,
  selecionarVersao,
  consultar,
  publicar,
  registrarReprovacao,
  destruir,
} = criarControleQualidade()

const conferencia = computed(() =>
  prepararConferenciaResultados(resultado.value),
)

const notificacaoAtual = computed(() =>
  notificacoes.value[0] ?? null,
)

function fecharNotificacao() {
  if (notificacaoAtual.value) {
    fechar(notificacaoAtual.value.id)
  }
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

onBeforeUnmount(destruir)
onMounted(carregarVersoes)
</script>

<template>
  <div class="qualidade-layout">
    <BarraNavegacao />

    <main class="qualidade-pagina">
      <header class="qualidade-cabecalho">
        <h1>Conferência dos resultados</h1>

        <p>
          Consulte os resultados da validação e solicite
          a publicação da versão.
        </p>
      </header>

      <section
        class="qualidade-card"
        aria-labelledby="qualidade-consulta-titulo"
      >
        <h2 id="qualidade-consulta-titulo">
          Selecionar execução e versão
        </h2>

        <form
          class="qualidade-consulta"
          @submit.prevent="consultar"
        >
          <div class="qualidade-campo">
            <label for="qualidade-execucao">
              Identificador da execução
            </label>

            <input
              id="qualidade-execucao"
              :value="execucaoId"
              type="text"
              inputmode="numeric"
              required
              :disabled="publicando || reprovando"
              placeholder="Código da execução"
              @input="
                selecionarExecucao($event.target.value)
              "
            />
          </div>

          <div class="qualidade-campo">
            <label for="qualidade-versao">
              Identificador da versão
            </label>

            <input
              id="qualidade-versao"
              list="qualidade-versoes"
              :value="versaoId"
              type="text"
              inputmode="numeric"
              :disabled="publicando || reprovando"
              placeholder="Código da versão"
              @input="
                selecionarVersao($event.target.value)
              "
            />
            <datalist id="qualidade-versoes">
              <option v-for="item in versoes" :key="item.id" :value="item.id">
                {{ item.conjuntoNome }} · {{ item.numero }} · {{ item.situacao }}
              </option>
            </datalist>
          </div>

          <button
            class="qualidade-tentar"
            type="submit"
            :disabled="ocupado"
          >
            {{
              carregando
                ? 'Consultando...'
                : 'Consultar qualidade'
            }}
          </button>
        </form>

        <p class="qualidade-ajuda">
          Informe os identificadores da execução e da
          versão que deseja conferir. O servidor valida
          a execução vinculada à versão ao publicar.
        </p>
      </section>

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
        v-else-if="falhouConferencia"
        class="qualidade-card qualidade-estado"
      >
        <h2>Conferência dos resultados</h2>

        <button
          type="button"
          class="qualidade-tentar"
          @click="consultar"
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
          Informe a execução acima e clique em
          Consultar qualidade.
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
              :class="
                `qualidade-selo--${conferencia.classeConclusao}`
              "
            >
              {{ conferencia.conclusao }}
            </span>
          </header>

          <dl class="qualidade-indicadores">
            <div
              v-for="indicador in conferencia.indicadores"
              :key="indicador.chave"
              class="qualidade-indicador"
              :class="
                `qualidade-indicador--${indicador.classe}`
              "
            >
              <dt>{{ indicador.titulo }}</dt>
              <dd>{{ indicador.valor }}</dd>
            </div>
          </dl>

          <div class="qualidade-aprovacao">
            <div
              class="qualidade-aprovacao-cabecalho"
            >
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
            Nenhuma regra violada informada nesta
            validação.
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
                Regras violadas e quantidade de
                ocorrências
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
          :versao="versaoSelecionada"
          :publicando="publicando || reprovando"
          @confirmar="publicar"
        />

        <p class="qualidade-observacao">
          A versão será apresentada como publicada
          somente após a confirmação do servidor.
        </p>
      </template>

      <section
        v-if="versaoConfirmada"
        class="qualidade-card"
        aria-labelledby="qualidade-confirmacao-titulo"
      >
        <h2 id="qualidade-confirmacao-titulo">
          Resposta confirmada pelo servidor
        </h2>

        <p class="qualidade-ajuda">
          Versão {{ versaoConfirmada.numero }}
          · Situação {{ versaoConfirmada.situacao }}
          · Execução
          {{ versaoConfirmada.execucaoId ?? 'Não informada' }}
        </p>
      </section>

      <section
        class="qualidade-card"
        aria-labelledby="qualidade-reprovacao-titulo"
      >
        <details>
          <summary id="qualidade-reprovacao-titulo">
            Registrar justificativa de reprovação
          </summary>

          <form
            class="qualidade-reprovacao"
            @submit.prevent="registrarReprovacao"
          >
            <label for="qualidade-motivo">
              Motivo
            </label>

            <textarea
              id="qualidade-motivo"
              v-model="motivoReprovacao"
              required
              :disabled="ocupado"
              rows="3"
            />

            <p class="qualidade-ajuda">
              A operação registra a justificativa na
              auditoria. A situação da versão permanece
              conforme a resposta do servidor.
            </p>

            <button
              class="qualidade-tentar"
              type="submit"
              :disabled="ocupado || !versaoId.trim()"
            >
              {{
                reprovando
                  ? 'Registrando...'
                  : 'Registrar justificativa'
              }}
            </button>
          </form>
        </details>
      </section>

      <ListaVersoesPublicadas
        :versoes="versoesPublicadas"
        titulo="Versões publicadas"
        descricao="Versões vigentes e anteriores consultadas no servidor."
        mensagem-vazia="Nenhuma versão publicada encontrada."
      />
      <button type="button" class="qualidade-tentar" :disabled="carregandoVersoes || ocupado" @click="carregarVersoes">
        {{ carregandoVersoes ? 'Consultando versões...' : 'Atualizar versões' }}
      </button>
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
