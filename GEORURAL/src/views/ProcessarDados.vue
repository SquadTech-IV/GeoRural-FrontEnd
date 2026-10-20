<script setup>
import { onBeforeUnmount } from 'vue'
import BarraNavegacao from '../components/BarraNavegacao.vue'

import {
  apresentarStatus,
  criarConsultaProcessamento,
  podeProcessarArquivo,
  statusArquivo,
} from '../services/processamentoService'

const {
  busca,
  origem,
  fonte,
  status,
  fontes,
  arquivosFiltrados,
  arquivoAtivo,
  arquivoAtivoId,
  arquivosSelecionados,
  camadasSelecionadas,
  todosVisiveisSelecionados,
  algunsVisiveisSelecionados,
  visiveisSelecionaveis,
  quantidadeArquivosSelecionados,
  quantidadeProcessadas,
  camadasMarcadas,
  notificacao,
  abrirArquivo,
  selecionarArquivo,
  selecionarVisiveis,
  selecionarCamada,
  processarCamada,
  processarCamadasMarcadas,
  processarArquivosSelecionados,
  solicitarMapa,
  fecharNotificacao,
  destruir,
} = criarConsultaProcessamento()

onBeforeUnmount(destruir)
</script>

<template>
  <div class="processamento-layout">
    <BarraNavegacao />

    <main class="processamento-pagina">
      <header class="processamento-cabecalho">
        <h1>Processar dados</h1>

        <p>
          Selecione arquivos do Data Lake ou camadas específicas
          para encaminhar ao processamento.
        </p>

        <span class="processamento-demonstracao">
          Demonstração com dados de exemplo
        </span>
      </header>

      <section
        class="processamento-filtros"
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
            Origem
          </span>

          <select v-model="origem">
            <option value="">Todas as origens</option>
            <option value="upload">Upload</option>
            <option value="api">API</option>
          </select>
        </label>

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
            Status
          </span>

          <select v-model="status">
            <option value="">Todos os status</option>
            <option value="pendente">Não processado</option>
            <option value="parcial">Parcial</option>
            <option value="processando">Processando</option>
            <option value="processado">Processado</option>
          </select>
        </label>
      </section>

      <div class="processamento-colunas">
        <section
          class="processamento-lista"
          aria-label="Arquivos disponíveis"
        >
          <header class="processamento-lista-cabecalho">
            <label class="processamento-selecao-geral">
              <input
                type="checkbox"
                :checked="todosVisiveisSelecionados"
                :indeterminate="algunsVisiveisSelecionados"
                :disabled="!visiveisSelecionaveis.length"
                @change="
                  selecionarVisiveis($event.target.checked)
                "
              />

              Selecionar visíveis
            </label>

            <span>
              {{ arquivosFiltrados.length }}
              {{ arquivosFiltrados.length === 1 ? 'arquivo' : 'arquivos' }}
            </span>
          </header>

          <ul
            v-if="arquivosFiltrados.length"
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
                :checked="arquivosSelecionados.has(arquivo.id)"
                :disabled="!podeProcessarArquivo(arquivo)"
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
                :aria-pressed="arquivo.id === arquivoAtivoId"
                @click="abrirArquivo(arquivo.id)"
              >
                <span class="processamento-arquivo-nome">
                  {{ arquivo.nome }}
                </span>

                <span class="processamento-arquivo-origem">
                  {{ arquivo.fonte }} ·
                  {{ arquivo.origem === 'upload' ? 'Upload' : 'API' }}
                </span>

                <span
                  class="processamento-status"
                  :class="`processamento-status--${
                    apresentarStatus(statusArquivo(arquivo)).classe
                  }`"
                >
                  {{
                    apresentarStatus(statusArquivo(arquivo)).texto
                  }}
                </span>
              </button>
            </li>
          </ul>

          <p v-else class="processamento-vazio">
            Nenhum arquivo encontrado com esses filtros.
          </p>

          <footer class="processamento-lista-rodape">
            <p>
              <strong>{{ quantidadeArquivosSelecionados }}</strong>
              arquivo(s) selecionado(s)
            </p>

            <button
              type="button"
              class="processamento-botao processamento-botao--principal"
              :disabled="!quantidadeArquivosSelecionados"
              @click="processarArquivosSelecionados"
            >
              Processar arquivos
            </button>
          </footer>
        </section>

        <section
          class="processamento-detalhe"
          aria-labelledby="processamento-detalhe-titulo"
        >
          <template v-if="arquivoAtivo">
            <header class="processamento-detalhe-cabecalho">
              <div>
                <h2 id="processamento-detalhe-titulo">
                  {{ arquivoAtivo.nome }}
                </h2>

                <p>
                  {{ arquivoAtivo.fonte }} ·
                  {{
                    arquivoAtivo.origem === 'upload'
                      ? 'Upload'
                      : 'API'
                  }}
                  · Competência {{ arquivoAtivo.competencia }}
                </p>
              </div>

              <span class="processamento-progresso">
                <strong>{{ quantidadeProcessadas }}</strong>
                de {{ arquivoAtivo.camadas.length }}
                camada(s) processada(s)
              </span>
            </header>

            <dl class="processamento-metadados">
              <div>
                <dt>Origem</dt>
                <dd>
                  {{
                    arquivoAtivo.origem === 'upload'
                      ? 'Upload'
                      : 'API'
                  }}
                </dd>
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
                <dt>Original preservado em</dt>
                <dd>{{ arquivoAtivo.zona }}</dd>
              </div>

              <div class="processamento-hash">
                <dt>Hash ilustrativo do original</dt>
                <dd>{{ arquivoAtivo.hash }}</dd>
              </div>
            </dl>

            <h3 class="processamento-secao-titulo">
              Camadas do arquivo
            </h3>

            <ul class="processamento-camadas">
              <li
                v-for="camada in arquivoAtivo.camadas"
                :key="camada.id"
                class="processamento-camada"
              >
                <input
                  type="checkbox"
                  :aria-label="`Selecionar camada ${camada.nome}`"
                  :checked="camadasSelecionadas.has(camada.id)"
                  :disabled="camada.status !== 'pendente'"
                  @change="
                    selecionarCamada(
                      camada.id,
                      $event.target.checked,
                    )
                  "
                />

                <div class="processamento-camada-conteudo">
                  <div class="processamento-camada-titulo">
                    <strong>{{ camada.nome }}</strong>

                    <span class="processamento-destino">
                      {{ camada.destino }}
                    </span>
                  </div>

                  <p>{{ camada.descricao }}</p>

                  <small v-if="camada.processadoEm">
                    Processado em {{ camada.processadoEm }}
                  </small>

                  <small v-else-if="camada.status === 'processando'">
                    Simulação em andamento
                  </small>
                </div>

                <div class="processamento-camada-acoes">
                  <button
                    v-if="camada.status === 'pendente'"
                    type="button"
                    class="processamento-botao"
                    :aria-label="`Processar camada ${camada.nome}`"
                    @click="
                      processarCamada(
                        arquivoAtivo.id,
                        camada.id,
                      )
                    "
                  >
                    Processar
                  </button>

                  <template v-else>
                    <span
                      class="processamento-status"
                      :class="`processamento-status--${
                        apresentarStatus(camada.status).classe
                      }`"
                    >
                      {{ apresentarStatus(camada.status).texto }}
                    </span>

                    <button
                      v-if="
                        camada.status === 'processado' &&
                        camada.mapa
                      "
                      type="button"
                      class="processamento-link"
                      @click="solicitarMapa"
                    >
                      Ver no mapa
                    </button>
                  </template>
                </div>
              </li>
            </ul>

            <footer class="processamento-detalhe-rodape">
              <p>
                {{ camadasMarcadas.length }}
                camada(s) selecionada(s)
              </p>

              <button
                type="button"
                class="processamento-botao processamento-botao--principal"
                :disabled="!camadasMarcadas.length"
                @click="processarCamadasMarcadas"
              >
                Processar selecionadas
              </button>
            </footer>

            <p class="processamento-observacao">
              O processamento pode incluir validação,
              tratamento e cálculo, conforme o tipo de dado.
              O arquivo original permanece preservado na zona
              bruta. Nesta demonstração, apenas os estados
              da interface são alterados.
            </p>
          </template>

          <div v-else class="processamento-vazio">
            <h2 id="processamento-detalhe-titulo">
              Selecione um arquivo
            </h2>

            <p>
              Os detalhes e as camadas serão exibidos aqui.
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
        :role="notificacao.tipo === 'erro' ? 'alert' : 'status'"
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
