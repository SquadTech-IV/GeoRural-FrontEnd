<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import BarraNavegacao from '../components/BarraNavegacao.vue'
import ToastMensagem from '../components/ToastMensagem.vue'
import { criarControleQualidade } from '../services/qualidadeControleService'

const router = useRouter()
const controle = criarControleQualidade()

const {
  fila,
  versaoSelecionada: versao,
  detalhe,
  justificativa,
  carregandoFila,
  carregandoDetalhe,
  enviando,
  erroFila,
  erroDetalhe,
  notificacoes,
  fecharNotificacao,
  carregarFila,
  escolherVersao,
  publicar,
  devolver,
  obterRotaQuarentena,
  destruir,
  fmt,
  fmtData,
} = controle

function irParaQuarentena() {
  const destino = obterRotaQuarentena()
  if (destino) router.push(destino)
}

onMounted(() => carregarFila(false))
onBeforeUnmount(() => destruir())
</script>

<template>
  <div>
    <BarraNavegacao />

    <main class="qualidade-pagina">
      <header class="qualidade-cabecalho">
        <h1>Conferência dos resultados</h1>

        <p>
          Aqui ficam as versões que o pipeline terminou de gerar e que estão
          esperando a sua decisão. Nada vira dado público antes de você publicar,
          tenha o processamento sido disparado por você ou pelo Airflow.
        </p>
      </header>

      <p v-if="erroFila" class="qualidade-erro" role="alert">
        {{ erroFila }}
      </p>

      <section class="qualidade-card" :aria-busy="carregandoFila">
        <header class="qualidade-secao-cabecalho">
          <h2>Esperando sua decisão</h2>
          <span>{{ fila.length }} versão(ões)</span>
        </header>

        <p
          v-if="carregandoFila && !fila.length"
          class="qualidade-vazio-fila"
        >
          Carregando versões...
        </p>

        <ul v-else-if="fila.length" class="qualidade-fila">
          <li v-for="v in fila" :key="v.id">
            <button
              type="button"
              class="qualidade-fila-item"
              :class="{
                'qualidade-fila-item--ativo': v.id === versao?.id,
              }"
              @click="escolherVersao(v.id)"
            >
              <span class="qualidade-fila-corpo">
                <span class="qualidade-fila-titulo">
                  Versão #{{ v.numero }} · {{ v.conjunto }}

                  <span
                    v-if="v.automatica"
                    class="qualidade-origem qualidade-origem--automatico"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path
                        d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"
                      />
                    </svg>
                    automático
                  </span>

                  <span
                    v-else
                    class="qualidade-origem qualidade-origem--manual"
                  >
                    manual
                  </span>
                </span>

                <span class="qualidade-fila-meta">
                  {{ v.arquivo }} · gerada em {{ fmtData(v.geradaEm) }} ·
                  {{ v.quem }}
                </span>
              </span>

              <dl class="qualidade-fila-numeros">
                <div>
                  <dt>Feições</dt>
                  <dd>{{ fmt(v.aprovadas) }}</dd>
                </div>

                <div>
                  <dt>Quarentena</dt>
                  <dd>{{ fmt(v.rejeitadas) }}</dd>
                </div>
              </dl>

              <span
                class="qualidade-selo"
                :class="`qualidade-selo--${v.conclusao.classe}`"
              >
                {{ v.conclusao.texto }}
              </span>
            </button>
          </li>
        </ul>

        <p v-else class="qualidade-vazio-fila">
          Nada esperando decisão. Quando o pipeline terminar uma versão,
          ela aparece aqui.
        </p>
      </section>

      <template v-if="versao">
        <p v-if="erroDetalhe" class="qualidade-erro" role="alert">
          {{ erroDetalhe }}
        </p>

        <p v-if="carregandoDetalhe" class="qualidade-vazio-fila">
          Carregando a conferência da versão...
        </p>

        <template v-else-if="detalhe">
          <section class="qualidade-card">
            <header class="qualidade-resumo-cabecalho">
              <div>
                <h2>
                  Versão #{{ versao.numero }} — {{ versao.conjunto }}
                </h2>
                <p>
                  {{ versao.arquivo }} · gerada em
                  {{ fmtData(versao.geradaEm) }}
                </p>
              </div>

              <span
                class="qualidade-selo"
                :class="`qualidade-selo--${detalhe.conclusao.classe}`"
              >
                {{ detalhe.conclusao.texto }}
              </span>
            </header>

            <dl class="qualidade-indicadores">
              <div class="qualidade-indicador">
                <dt>Feições recebidas</dt>
                <dd>{{ fmt(detalhe.recebidas) }}</dd>
              </div>

              <div class="qualidade-indicador qualidade-indicador--sucesso">
                <dt>Entraram na versão</dt>
                <dd>{{ fmt(detalhe.entraram) }}</dd>
              </div>

              <div
                class="qualidade-indicador"
                :class="
                  detalhe.quarentena
                    ? 'qualidade-indicador--aviso'
                    : 'qualidade-indicador--sucesso'
                "
              >
                <dt>Foram para a quarentena</dt>
                <dd>{{ fmt(detalhe.quarentena) }}</dd>
              </div>

              <div class="qualidade-indicador">
                <dt>Imóveis calculados</dt>
                <dd>
                  {{
                    detalhe.imoveisCalculados === null
                      ? '—'
                      : fmt(detalhe.imoveisCalculados)
                  }}
                </dd>
              </div>
            </dl>

            <div class="qualidade-aprovacao">
              <div class="qualidade-aprovacao-cabecalho">
                <h3>Percentual de aprovação</h3>
                <strong>{{ detalhe.percentualTexto }}%</strong>
              </div>

              <progress
                class="qualidade-progresso"
                :value="detalhe.percentual"
                max="100"
              ></progress>

              <p v-if="detalhe.quarentena" class="qualidade-ajuda">
                As {{ fmt(detalhe.quarentena) }} feições recusadas estão
                na quarentena com o motivo gravado.

                <button
                  type="button"
                  class="qualidade-link"
                  @click="irParaQuarentena"
                >
                  Ver na quarentena
                </button>
              </p>

              <p v-else class="qualidade-ajuda">
                Nenhuma feição foi recusada nesta rodada.
              </p>
            </div>

            <div class="qualidade-rodada">
              De onde veio esta versão:
              <strong>
                {{
                  versao.automatica
                    ? 'processamento automático'
                    : 'processamento manual'
                }}
              </strong>
              · {{ versao.quem }}

              <template v-if="versao.dagRunId">
                <br />
                Identificador da execução no Airflow:
                <code>{{ versao.dagRunId }}</code>
              </template>

              <br />
              As seis etapas desta rodada estão em Linhagem e auditoria,
              presas por esse mesmo identificador.
            </div>
          </section>

          <section
            v-if="detalhe.blocos.length"
            class="qualidade-card"
          >
            <header class="qualidade-secao-cabecalho">
              <h2>Indicadores desta versão</h2>
              <span class="qualidade-selo qualidade-selo--neutro">
                ainda não valem
              </span>
            </header>

            <p class="qualidade-ajuda">
              Estes números já foram calculados no processamento e estão
              guardados como não vigentes. Publicar é o que faz eles
              passarem a valer no mapa, nas consultas e na tela de imóveis.
            </p>

            <div class="qualidade-blocos">
              <template v-for="b in detalhe.blocos" :key="b.titulo">
                <article
                  v-if="b.vazio"
                  class="qualidade-bloco qualidade-bloco--vazio"
                >
                  <p style="margin: 0">
                    <strong>{{ b.titulo }}</strong><br />
                    Não foi recalculado nesta versão — continua valendo
                    o resultado da versão anterior.
                  </p>
                </article>

                <article v-else class="qualidade-bloco">
                  <h3>{{ b.titulo }}</h3>

                  <p class="qualidade-bloco-total">
                    {{ fmt(b.total) }} imóveis calculados
                  </p>

                  <div class="qualidade-barra">
                    <i
                      class="qualidade-barra-bom"
                      :style="{ width: `${b.pctBom}%` }"
                    ></i>

                    <i
                      class="qualidade-barra-ruim"
                      :style="{ width: `${100 - b.pctBom}%` }"
                    ></i>
                  </div>

                  <dl class="qualidade-legenda">
                    <div>
                      <dt>
                        <span
                          class="qualidade-ponto qualidade-ponto--bom"
                        ></span>
                        {{ b.bom.rotulo }}
                      </dt>
                      <dd>{{ fmt(b.bom.valor) }}</dd>
                    </div>

                    <div>
                      <dt>
                        <span
                          class="qualidade-ponto qualidade-ponto--ruim"
                        ></span>
                        {{ b.ruim.rotulo }}
                      </dt>
                      <dd>{{ fmt(b.ruim.valor) }}</dd>
                    </div>
                  </dl>

                  <p
                    v-if="b.comparacao"
                    class="qualidade-comparacao"
                  >
                    Contra a versão #{{ b.comparacao.versaoAnterior }},
                    que está valendo hoje:

                    <span
                      class="qualidade-delta"
                      :class="
                        b.comparacao.melhor
                          ? 'qualidade-delta--melhor'
                          : 'qualidade-delta--pior'
                      "
                    >
                      {{ b.comparacao.frase }}
                    </span>
                  </p>

                  <p v-else class="qualidade-comparacao">
                    Primeira versão deste conjunto: não há com o que comparar.
                  </p>
                </article>
              </template>
            </div>
          </section>

          <section class="qualidade-card">
            <header class="qualidade-secao-cabecalho">
              <h2>Regras violadas</h2>
              <span>
                {{ detalhe.regrasQueFalharam.length }} regra(s)
              </span>
            </header>

            <div
              v-if="detalhe.regrasQueFalharam.length"
              class="qualidade-tabela-container"
            >
              <table class="qualidade-tabela">
                <thead>
                  <tr>
                    <th>Regra</th>
                    <th>Tipo</th>
                    <th>Severidade</th>
                    <th class="num">Ocorrências</th>
                  </tr>
                </thead>

                <tbody>
                  <tr
                    v-for="r in detalhe.regrasQueFalharam"
                    :key="r.nomeRegra"
                  >
                    <th scope="row">{{ r.nomeRegra }}</th>
                    <td>{{ r.tipo }}</td>

                    <td>
                      <span
                        class="qualidade-severidade"
                        :class="
                          r.severidade === 'BLOQUEIA'
                            ? 'qualidade-severidade--bloqueia'
                            : 'qualidade-severidade--avisa'
                        "
                      >
                        {{ r.severidade }}
                      </span>
                    </td>

                    <td class="num">
                      {{ fmt(r.registrosAfetados) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p v-else class="qualidade-lista-vazia">
              Nenhuma regra foi violada nesta versão.
            </p>
          </section>

          <section class="qualidade-card">
            <h2>Pontos de atenção</h2>

            <ul
              v-if="detalhe.motivos.length"
              class="qualidade-motivos"
            >
              <li v-for="m in detalhe.motivos" :key="m">
                {{ m }}
              </li>
            </ul>

            <p v-else class="qualidade-lista-vazia">
              Nada a ressalvar.
            </p>
          </section>

          <section class="qualidade-card">
            <h2>Publicar a versão #{{ versao.numero }}</h2>

            <p class="qualidade-ajuda">
              Publicar é o que faz esta versão virar o dado vigente:
              ela passa a valer no mapa, nos indicadores e nas consultas.
              A versão que estava valendo antes não é apagada, só deixa
              de ser a vigente.
            </p>

            <div class="qualidade-decisao" style="margin-top: 14px">
              <label for="justificativa">
                Justificativa ou motivo da decisão
              </label>

              <textarea
                id="justificativa"
                v-model="justificativa"
                :disabled="enviando"
                placeholder="Informe a justificativa para publicar ou o motivo para devolver a versão."
              ></textarea>

              <div class="qualidade-decisao-acoes">
                <button
                  type="button"
                  class="qualidade-botao qualidade-botao--recusar"
                  :disabled="enviando"
                  @click="devolver"
                >
                  {{ enviando ? 'Enviando...' : 'Devolver para correção' }}
                </button>

                <button
                  type="button"
                  class="qualidade-botao qualidade-botao--principal"
                  :disabled="enviando"
                  @click="publicar"
                >
                  {{
                    enviando
                      ? 'Enviando...'
                      : `Publicar versão #${versao.numero}`
                  }}
                </button>
              </div>
            </div>
          </section>
        </template>
      </template>
    </main>

    <ToastMensagem
      v-if="notificacoes.length"
      :mensagem="notificacoes[0].mensagem"
      :tipo="notificacoes[0].tipo"
      :duracao="notificacoes[0].tipo === 'sucesso' ? 6000 : 0"
      @fechar="fecharNotificacao(notificacoes[0].id)"
    />
  </div>
</template>

<style scoped src="../assets/css/qualidade-dados.css"></style>
