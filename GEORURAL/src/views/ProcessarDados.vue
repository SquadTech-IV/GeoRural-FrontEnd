<script setup>
import {
  onBeforeUnmount,
  onMounted,
} from 'vue'

import BarraNavegacao from '../components/BarraNavegacao.vue'

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

onMounted(carregarArquivos)
onBeforeUnmount(destruir)
</script>

<template>
  <div class="processamento-layout">
    <BarraNavegacao />

    <main class="processamento-pagina">
      <header class="processamento-cabecalho">
        <h1>Processar dados</h1>

        <p>
          Consulte os arquivos cadastrados no Data Lake
          e encaminhe os originais para processamento.
        </p>
      </header>

      <section
        class="processamento-filtros processamento-filtros--api"
        aria-label="Filtros dos arquivos"
      >
        <div class="processamento-busca">
          <label
            for="processamento-busca"
            class="processamento-somente-leitor"
          >
            Buscar arquivo
          </label>

          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            aria-hidden="true"
          >
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>

          <input
            id="processamento-busca"
            v-model="busca"
            type="search"
            placeholder="Buscar arquivo..."
          />
        </div>

        <label class="processamento-filtro">
          <span class="processamento-somente-leitor">
            Fonte
          </span>

          <select v-model="fonte">
            <option value="">Todas as fontes</option>

            <option
              v-for="item in fontes"
              :key="item"
              :value="item"
            >
              {{ item }}
            </option>
          </select>
        </label>

        <label class="processamento-filtro">
          <span class="processamento-somente-leitor">
            Situação
          </span>

          <select v-model="status">
            <option value="">Todas as situações</option>

            <option
              v-for="item in situacoes"
              :key="item"
              :value="item"
            >
              {{ apresentarStatus(item).texto }}
            </option>
          </select>
        </label>

        <button
          type="button"
          class="processamento-botao"
          :disabled="carregando || enviando"
          @click="carregarArquivos"
        >
          {{ carregando ? 'Atualizando...' : 'Atualizar' }}
        </button>
      </section>

      <div class="processamento-colunas">
        <section
          class="processamento-lista"
          aria-label="Arquivos disponíveis"
          :aria-busy="carregando"
        >
          <header class="processamento-lista-cabecalho">
            <label class="processamento-selecao-geral">
              <input
                type="checkbox"
                :checked="todosVisiveisSelecionados"
                :indeterminate="algunsVisiveisSelecionados"
                :disabled="
                  carregando ||
                  enviando ||
                  !arquivosFiltrados.length
                "
                @change="
                  selecionarVisiveis($event.target.checked)
                "
              />

              Selecionar visíveis
            </label>

            <span>
              {{ arquivosFiltrados.length }}
              arquivo(s)
            </span>
          </header>

          <p
            v-if="carregando"
            class="processamento-vazio"
            role="status"
          >
            Carregando arquivos...
          </p>

          <div
            v-else-if="falhouLista"
            class="processamento-vazio"
          >
            <button
              type="button"
              class="processamento-botao"
              @click="carregarArquivos"
            >
              Tentar carregar novamente
            </button>
          </div>

          <ul
            v-else-if="arquivosFiltrados.length"
            class="processamento-arquivos"
          >
            <li
              v-for="arquivo in arquivosFiltrados"
              :key="arquivo.id"
              class="processamento-arquivo"
              :class="{
                'processamento-arquivo--ativo':
                  arquivo.id === arquivoAtivoId,
              }"
            >
              <input
                type="checkbox"
                :aria-label="`Selecionar ${arquivo.nome}`"
                :checked="
                  arquivosSelecionados.has(arquivo.id)
                "
                :disabled="enviando"
                @change="
                  selecionarArquivo(
                    arquivo.id,
                    $event.target.checked,
                  )
                "
              />

              <button
                type="button"
                class="processamento-arquivo-abrir"
                :aria-pressed="
                  arquivo.id === arquivoAtivoId
                "
                @click="abrirArquivo(arquivo.id)"
              >
                <span class="processamento-arquivo-nome">
                  {{ arquivo.nome }}
                </span>

                <span class="processamento-arquivo-origem">
                  {{ arquivo.fonte }} · {{ arquivo.formato }}
                </span>

                <span
                  class="processamento-status"
                  :class="`processamento-status--${
                    apresentarStatus(arquivo.situacao).classe
                  }`"
                >
                  {{
                    apresentarStatus(arquivo.situacao).texto
                  }}
                </span>
              </button>
            </li>
          </ul>

          <p v-else class="processamento-vazio">
            Nenhum arquivo encontrado.
          </p>

          <footer class="processamento-lista-rodape">
            <p>
              <strong>
                {{ quantidadeArquivosSelecionados }}
              </strong>
              arquivo(s) selecionado(s), incluindo seleções
              fora do filtro atual.
            </p>

            <button
              type="button"
              class="processamento-botao processamento-botao--principal"
              :disabled="
                !quantidadeArquivosSelecionados ||
                carregando ||
                falhouLista ||
                enviando
              "
              @click="processarArquivosSelecionados"
            >
              {{
                enviando
                  ? 'Encaminhando...'
                  : 'Encaminhar selecionados'
              }}
            </button>
          </footer>
        </section>

        <section
          class="processamento-detalhe"
          aria-labelledby="processamento-detalhe-titulo"
          :aria-busy="carregandoDetalhe"
        >
          <template v-if="carregandoDetalhe">
            <h2
              id="processamento-detalhe-titulo"
              class="processamento-secao-titulo"
            >
              Detalhes do arquivo
            </h2>

            <p class="processamento-vazio" role="status">
              Carregando detalhes...
            </p>
          </template>

          <template v-else-if="falhouDetalhe">
            <h2
              id="processamento-detalhe-titulo"
              class="processamento-secao-titulo"
            >
              Detalhes do arquivo
            </h2>

            <div class="processamento-vazio">
              <button
                type="button"
                class="processamento-botao"
                @click="abrirArquivo(arquivoAtivoId)"
              >
                Tentar carregar novamente
              </button>
            </div>
          </template>

          <template v-else-if="arquivoAtivo">
            <header class="processamento-detalhe-cabecalho">
              <div>
                <h2 id="processamento-detalhe-titulo">
                  {{ arquivoAtivo.nome }}
                </h2>

                <p>
                  {{ arquivoAtivo.fonte }} ·
                  {{ arquivoAtivo.formato }}
                </p>
              </div>

              <span
                class="processamento-status"
                :class="`processamento-status--${
                  apresentarStatus(arquivoAtivo.situacao).classe
                }`"
              >
                {{
                  apresentarStatus(arquivoAtivo.situacao).texto
                }}
              </span>
            </header>

            <dl class="processamento-metadados">
              <div>
                <dt>Fonte</dt>
                <dd>{{ arquivoAtivo.fonte }}</dd>
              </div>

              <div>
                <dt>Recebido em</dt>
                <dd>{{ arquivoAtivo.recebidoEm }}</dd>
              </div>

              <div>
                <dt>Tamanho</dt>
                <dd>{{ arquivoAtivo.tamanho }}</dd>
              </div>

              <div>
                <dt>Formato</dt>
                <dd>{{ arquivoAtivo.formato }}</dd>
              </div>

              <div>
                <dt>Sistema de referência</dt>

                <dd>
                  {{
                    arquivoAtivo.srid != null
                      ? `EPSG:${arquivoAtivo.srid}`
                      : 'Não informado'
                  }}
                </dd>
              </div>

              <div>
                <dt>Quantidade informada</dt>
                <dd>
                  {{ arquivoAtivo.quantidade ?? 'Não informada' }}
                </dd>
              </div>
            </dl>

            <p
              v-if="arquivoAtivo.descricao"
              class="processamento-descricao-api"
            >
              {{ arquivoAtivo.descricao }}
            </p>

            <h3 class="processamento-secao-titulo">
              Conteúdo do arquivo
            </h3>

            <ul
              v-if="arquivoAtivo.itens.length"
              class="processamento-camadas"
            >
              <li
                v-for="item in arquivoAtivo.itens"
                :key="item.id"
                class="processamento-camada processamento-item-api"
              >
                <div class="processamento-camada-conteudo">
                  <div class="processamento-camada-titulo">
                    <strong>{{ item.nome }}</strong>

                    <span class="processamento-destino">
                      {{ item.formato }}
                    </span>
                  </div>

                  <p>{{ item.tamanho }}</p>

                  <small v-if="item.descricao">
                    {{ item.descricao }}
                  </small>
                </div>
              </li>
            </ul>

            <p v-else class="processamento-vazio">
              O backend não retornou itens internos
              para este arquivo.
            </p>

            <footer class="processamento-detalhe-rodape">
              <button
                type="button"
                class="processamento-botao"
                :disabled="baixando"
                @click="baixarOriginal"
              >
                {{ baixando ? 'Baixando...' : 'Baixar original' }}
              </button>

              <button
                type="button"
                class="processamento-botao processamento-botao--principal"
                :disabled="enviando || carregando"
                @click="processarArquivoAtivo"
              >
                {{
                  enviando
                    ? 'Encaminhando...'
                    : 'Encaminhar arquivo'
                }}
              </button>
            </footer>

            <div
              v-if="
                ultimaEntrega &&
                String(ultimaEntrega.id) === arquivoAtivo.id
              "
              class="processamento-confirmacao"
              role="status"
            >
              <strong>Encaminhamento confirmado</strong>

              <p>
                {{
                  ultimaEntrega.mensagem ||
                  'O backend confirmou o recebimento da solicitação.'
                }}
              </p>

              <p>
                Esta confirmação não indica que
                o processamento foi concluído.
              </p>
            </div>

            <p class="processamento-observacao">
              O encaminhamento utiliza o arquivo completo.
              A versão atual do backend não oferece seleção
              de camadas nem acompanhamento da execução
              do pipeline.
            </p>
          </template>

          <div v-else class="processamento-vazio">
            <h2 id="processamento-detalhe-titulo">
              Selecione um arquivo
            </h2>

            <p>
              Os detalhes serão exibidos aqui.
            </p>
          </div>
        </section>
      </div>
    </main>

    <Teleport to="body">
      <div
        v-if="notificacao"
        :key="notificacao.id"
        class="processamento-toast"
        :class="`processamento-toast--${notificacao.tipo}`"
        :role="
          notificacao.tipo === 'erro'
            ? 'alert'
            : 'status'
        "
        aria-atomic="true"
      >
        <p>{{ notificacao.mensagem }}</p>

        <button
          type="button"
          aria-label="Fechar notificação"
          @click="fecharNotificacao"
        >
          ×
        </button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped src="../assets/css/processamento.css"></style>
