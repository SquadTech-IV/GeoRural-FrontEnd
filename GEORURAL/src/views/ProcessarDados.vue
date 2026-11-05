<script setup>
import { computed, onBeforeUnmount, onMounted } from 'vue'

import BarraNavegacao from '../components/BarraNavegacao.vue'
import ToastMensagem from '../components/ToastMensagem.vue'

import {
  apresentarStatus,
  criarConsultaProcessamento,
} from '../services/processamentoService'

const {
  busca,
  fonte,
  status,
  fontes,
  situacoes,
  arquivos,
  arquivosFiltrados,
  arquivoAtivo,
  arquivoAtivoId,
  arquivosSelecionados,
  todosVisiveisSelecionados,
  algunsVisiveisSelecionados,
  quantidadeArquivosSelecionados,
  carregando,
  carregandoDetalhe,
  falhouLista,
  falhouDetalhe,
  enviando,
  baixando,
  ultimaEntrega,
  notificacao,
  carregarArquivos,
  abrirArquivo,
  selecionarArquivo,
  selecionarVisiveis,
  processarArquivosSelecionados,
  processarArquivoAtivo,
  baixarOriginal,
  fecharNotificacao,
  destruir,
} = criarConsultaProcessamento()

const contarPorClasse = (...classes) =>
  (arquivos.value ?? []).filter((arquivo) =>
    classes.includes(apresentarStatus(arquivo.situacao).classe)
  ).length

const totalArquivos = computed(() => arquivos.value?.length ?? 0)
const totalProcessados = computed(() => contarPorClasse('sucesso'))
const totalPendentes = computed(() => contarPorClasse('pendente', 'processando'))
const totalComErro = computed(() => contarPorClasse('erro'))

const percentualProcessados = computed(() =>
  totalArquivos.value
    ? Math.round((totalProcessados.value / totalArquivos.value) * 100)
    : 0
)

const arquivoAtivoProcessado = computed(() =>
  arquivoAtivo.value
    ? apresentarStatus(arquivoAtivo.value.situacao).classe === 'sucesso'
    : false
)

const historicoAtivo = computed(() => arquivoAtivo.value?.historico ?? [])

const etapasConcluidas = computed(() =>
  historicoAtivo.value.filter(
    (etapa) => apresentarStatus(etapa.situacao).classe === 'sucesso'
  ).length
)

function limparFiltros() {
  busca.value = ''
  fonte.value = ''
  status.value = ''
}

onMounted(carregarArquivos)
onBeforeUnmount(destruir)
</script>

<template>
  <div class="processamento-layout">
    <BarraNavegacao />

    <main class="processamento-pagina">
      <header class="processamento-cabecalho">
        <div>
          <span class="processamento-eyebrow">
            DATA LAKE / OPERAÇÕES
          </span>

          <h1>Processar dados</h1>

          <p>
            Consulte os arquivos cadastrados e encaminhe os originais
            para processamento.
          </p>
        </div>

        <button class="processamento-atualizar" type="button" :disabled="carregando || enviando"
          @click="carregarArquivos">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M20 7v5h-5M4 17v-5h5" />
            <path d="M5.5 9a7 7 0 0 1 12-2L20 12M4 12l2.5 5a7 7 0 0 0 12-2" />
          </svg>
          {{ carregando ? 'Atualizando...' : 'Atualizar dados' }}
        </button>
      </header>

      <section class="processamento-filtros">
        <div class="processamento-busca">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>

          <input v-model="busca" type="search" placeholder="Buscar arquivo..." aria-label="Buscar arquivo" />
        </div>

        <label class="processamento-select">
          <span class="sr-only">Fonte</span>
          <select v-model="fonte">
            <option value="">Todas as fontes</option>
            <option v-for="item in fontes" :key="item" :value="item">
              {{ item }}
            </option>
          </select>
        </label>

        <label class="processamento-select">
          <span class="sr-only">Situação</span>
          <select v-model="status">
            <option value="">Todas as situações</option>
            <option v-for="item in situacoes" :key="item" :value="item">
              {{ apresentarStatus(item).texto }}
            </option>
          </select>
        </label>

        <button class="processamento-limpar" type="button" @click="limparFiltros">
          Limpar
        </button>
      </section>

      <section class="processamento-indicadores">
        <article class="processamento-indicador">
          <div class="indicador-topo">
            <span>Total de arquivos</span>
            <span class="indicador-icone">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M6 3h8l5 5v13H6z" />
                <path d="M14 3v6h5M9 14h7M9 17h7" />
              </svg>
            </span>
          </div>
          <strong>{{ totalArquivos }}</strong>
          <small>Arquivos cadastrados</small>
        </article>

        <article class="processamento-indicador">
          <div class="indicador-topo">
            <span>Pendentes</span>
            <span class="indicador-icone indicador-icone--amarelo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
            </span>
          </div>
          <strong>{{ totalPendentes }}</strong>
          <small>Aguardando processamento</small>
        </article>

        <article class="processamento-indicador">
          <div class="indicador-topo">
            <span>Processados</span>
            <span class="indicador-icone indicador-icone--verde">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="9" />
                <path d="m8 12 3 3 5-6" />
              </svg>
            </span>
          </div>
          <strong>{{ totalProcessados }}</strong>
          <small>{{ percentualProcessados }}% do total</small>
          <div class="indicador-progresso">
            <span :style="{ width: `${percentualProcessados}%` }"></span>
          </div>
        </article>

        <article class="processamento-indicador">
          <div class="indicador-topo">
            <span>Com erro</span>
            <span class="indicador-icone indicador-icone--vermelho">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="9" />
                <path d="m9 9 6 6m0-6-6 6" />
              </svg>
            </span>
          </div>
          <strong>{{ totalComErro }}</strong>
          <small>Necessitam de atenção</small>
        </article>
      </section>

      <div class="processamento-colunas">

        <section class="processamento-lista painel" aria-label="Arquivos disponíveis" :aria-busy="carregando">
          <header class="painel-cabecalho">
            <div>
              <h2>Arquivos disponíveis</h2>
              <p>Selecione um arquivo para visualizar os detalhes.</p>
            </div>

            <span class="contador-arquivos">
              {{ arquivosFiltrados.length }}
            </span>
          </header>

          <div class="lista-selecao-geral">
            <label>
              <input type="checkbox" :checked="todosVisiveisSelecionados" :indeterminate="algunsVisiveisSelecionados"
                :disabled="carregando || enviando || !arquivosFiltrados.length"
                @change="selecionarVisiveis($event.target.checked)" />
              Selecionar visíveis
            </label>

            <span>
              {{ quantidadeArquivosSelecionados }} selecionados
            </span>
          </div>

          <div v-if="carregando" class="processamento-vazio">
            <span class="processamento-spinner"></span>
            Carregando arquivos...
          </div>

          <div v-else-if="falhouLista" class="processamento-vazio">
            Não foi possível carregar os arquivos.
          </div>

          <ul v-else-if="arquivosFiltrados.length" class="processamento-arquivos">
            <li v-for="arquivo in arquivosFiltrados" :key="arquivo.id" class="processamento-arquivo" :class="{
              'processamento-arquivo--ativo':
                arquivo.id === arquivoAtivoId,
            }">
              <input type="checkbox" :aria-label="`Selecionar ${arquivo.nome}`"
                :checked="arquivosSelecionados.has(arquivo.id)" :disabled="enviando" @change="
                  selecionarArquivo(arquivo.id, $event.target.checked)
                  " />

              <button type="button" class="processamento-arquivo-abrir" :aria-pressed="arquivo.id === arquivoAtivoId"
                @click="abrirArquivo(arquivo.id)">
                <span class="arquivo-info">
                  <span class="arquivo-nome">{{ arquivo.nome }}</span>
                  <span class="arquivo-origem">{{ arquivo.fonte }}</span>
                </span>

                <span class="processamento-status-ponto"
                  :class="`processamento-status-ponto--${apresentarStatus(arquivo.situacao).classe}`"
                  :title="apresentarStatus(arquivo.situacao).texto"
                  :aria-label="apresentarStatus(arquivo.situacao).texto" role="img"></span>
              </button>
            </li>
          </ul>

          <div v-else class="processamento-vazio">
            Nenhum arquivo encontrado.
          </div>

          <footer class="processamento-lista-rodape">
            <p>
              {{ quantidadeArquivosSelecionados }} arquivo(s) selecionado(s).
            </p>

            <button type="button" class="botao-principal"
              :disabled="!quantidadeArquivosSelecionados || enviando || carregando"
              @click="processarArquivosSelecionados">
              {{ enviando ? 'Processando...' : 'Processar selecionados' }}
            </button>
          </footer>
        </section>

        <section class="processamento-detalhe painel">

          <div v-if="carregandoDetalhe" class="processamento-vazio">
            <span class="processamento-spinner"></span>
            Carregando detalhes...
          </div>

          <div v-else-if="falhouDetalhe" class="detalhe-sem-selecao">
            <p>Não foi possível carregar os detalhes do arquivo.</p>
          </div>

          <template v-else-if="arquivoAtivo">

            <header class="detalhe-cabecalho">
              <div class="detalhe-titulo">
                <span class="processamento-eyebrow">
                  ARQUIVO SELECIONADO
                </span>

                <h2>{{ arquivoAtivo.nome }}</h2>

                <p>
                  Recebido em {{ arquivoAtivo.recebidoEm }}
                </p>
              </div>

              <span class="processamento-status"
                :class="`processamento-status--${apresentarStatus(arquivoAtivo.situacao).classe}`">
                {{ apresentarStatus(arquivoAtivo.situacao).texto }}
              </span>
            </header>

            <div class="detalhe-metadados">
              <div>
                <span>Fonte</span>
                <strong>{{ arquivoAtivo.fonte }}</strong>
              </div>

              <div>
                <span>Tamanho</span>
                <strong>{{ arquivoAtivo.tamanho }}</strong>
              </div>

              <div>
                <span>Formato</span>
                <strong>{{ arquivoAtivo.formato }}</strong>
              </div>

              <div>
                <span>Sistema de referência</span>
                <strong>EPSG:{{ arquivoAtivo.srid }}</strong>
              </div>

              <div>
                <span>Quantidade informada</span>
                <strong>{{ arquivoAtivo.quantidade ?? 'Não informada' }}</strong>
              </div>

              <div>
                <span>Descrição</span>
                <strong>{{ arquivoAtivo.descricao || 'Sem descrição' }}</strong>
              </div>
            </div>

            <div class="detalhe-secao">
              <div class="detalhe-secao-titulo">
                <div>
                  <h3>Conteúdo do arquivo</h3>
                  <p>Camadas e componentes identificados.</p>
                </div>

                <span>{{ arquivoAtivo.itens.length }} itens</span>
              </div>

              <ul class="processamento-camadas">
                <li v-for="item in arquivoAtivo.itens" :key="item.id" class="processamento-camada">
                  <span class="camada-icone">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
                      <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
                    </svg>
                  </span>

                  <div class="camada-conteudo">
                    <strong>{{ item.nome }}</strong>
                    <span>{{ item.formato }} · {{ item.tamanho }}</span>
                    <small>{{ item.descricao }}</small>
                  </div>
                </li>
              </ul>
            </div>

            <div v-if="ultimaEntrega && ultimaEntrega.id === arquivoAtivo.id" class="processamento-confirmacao"
              role="status">
              <strong>Envio confirmado</strong>
              <p>
                {{ ultimaEntrega.mensagem || `O arquivo ${arquivoAtivo.nome} foi encaminhado para processamento.` }}
              </p>
            </div>

            <footer class="detalhe-acoes">
              <button type="button" class="botao-secundario" :disabled="baixando" @click="baixarOriginal">
                {{ baixando ? 'Gerando...' : 'Baixar original' }}
              </button>

              <button type="button" class="botao-principal" :disabled="enviando || arquivoAtivoProcessado"
                @click="processarArquivoAtivo">
                {{
                  enviando
                    ? 'Processando...'
                    : arquivoAtivoProcessado
                      ? 'Já processado'
                      : 'Processar arquivo'
                }}
              </button>
            </footer>
          </template>

          <div v-else class="detalhe-sem-selecao">
            <h2>Selecione um arquivo</h2>
            <p>Os detalhes serão exibidos aqui.</p>
          </div>
        </section>
      </div>

      <details v-if="arquivoAtivo && historicoAtivo.length" class="processamento-historico painel">
        <summary class="painel-cabecalho">
          <div>
            <h2>O que aconteceu em cada etapa</h2>
            <p>Execução do arquivo {{ arquivoAtivo.nome }}</p>
          </div>

          <span class="historico-resumo-lado">
            <span class="historico-legenda">
              {{ etapasConcluidas }} / {{ historicoAtivo.length }} etapas concluídas
            </span>

            <svg class="historico-seta" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </summary>

        <div class="historico-tabela-wrapper">
          <table class="historico-tabela">
            <thead>
              <tr>
                <th>Etapa</th>
                <th>Situação</th>
                <th>Entrada</th>
                <th>Saída</th>
                <th>Descrição</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="(etapa, index) in historicoAtivo" :key="etapa.etapa || index">
                <td>
                  <div class="historico-etapa">
                    <span>{{ index + 1 }}</span>
                    <strong>{{ etapa.etapa }}</strong>
                  </div>
                </td>

                <td>
                  <span class="processamento-status"
                    :class="`processamento-status--${apresentarStatus(etapa.situacao).classe}`">
                    {{ apresentarStatus(etapa.situacao).texto }}
                  </span>
                </td>

                <td>{{ etapa.entrada }}</td>
                <td>{{ etapa.saida }}</td>
                <td class="historico-descricao">
                  {{ etapa.descricao }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>

      <ToastMensagem v-if="notificacao" :mensagem="notificacao.mensagem" :tipo="notificacao.tipo" :duracao="4000"
        @fechar="fecharNotificacao" />

    </main>
  </div>
</template>

<style scoped src="../assets/css/processamento.css"></style>
