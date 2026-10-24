<script setup>
import {
  onBeforeUnmount,
  watch,
} from 'vue'

import { RouterLink } from 'vue-router'
import BarraNavegacao from '../components/BarraNavegacao.vue'

import {
  formatarDataRecebimento,
  formatarTamanhoArquivo,
} from '../services/arquivosRecebidosService'

import {
  criarDetalheArquivoRecebido,
} from '../services/detalheArquivoRecebidoService'

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
})

const {
  arquivo,
  carregando,
  baixando,
  falhou,
  mensagem,
  consultar,
  baixarOriginal,
  fecharMensagem,
  destruir,
} = criarDetalheArquivoRecebido()

watch(
  () => props.id,
  id => consultar(id),
  { immediate: true },
)

onBeforeUnmount(destruir)
</script>

<template>
  <div class="recebidos-layout">
    <BarraNavegacao />

    <main class="recebidos-pagina">
      <RouterLink
        to="/arquivos-recebidos"
        class="arquivo-detalhe-voltar"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m12 5-7 7 7 7M5 12h14" />
        </svg>

        Voltar para arquivos recebidos
      </RouterLink>

      <header class="recebidos-cabecalho">
        <h1>Detalhes do arquivo</h1>

        <p>
          Consulte as informações de recebimento
          e baixe o arquivo original.
        </p>
      </header>

      <section
        v-if="carregando"
        class="recebidos-card"
        aria-busy="true"
      >
        <p class="recebidos-estado" role="status">
          Carregando detalhes...
        </p>
      </section>

      <section
        v-else-if="falhou"
        class="recebidos-card"
      >
        <div class="recebidos-estado">
          <button
            type="button"
            class="recebidos-botao"
            @click="consultar(id)"
          >
            Tentar novamente
          </button>
        </div>
      </section>

      <template v-else-if="arquivo">
        <section
          class="recebidos-card"
          aria-labelledby="arquivo-identificacao-titulo"
        >
          <header class="arquivo-detalhe-cabecalho">
            <div>
              <h2 id="arquivo-identificacao-titulo">
                {{
                  arquivo.nomeArquivo ||
                  arquivo.nome ||
                  'Arquivo sem nome'
                }}
              </h2>

              <p v-if="arquivo.nome">
                {{ arquivo.nome }}
              </p>
            </div>

            <button
              type="button"
              class="recebidos-botao recebidos-botao--principal"
              :disabled="baixando"
              @click="baixarOriginal"
            >
              {{ baixando ? 'Baixando...' : 'Baixar original' }}
            </button>
          </header>

          <dl class="arquivo-detalhe-grade">
            <div>
              <dt>Fonte</dt>
              <dd>{{ arquivo.fonte || 'Não informada' }}</dd>
            </div>

            <div>
              <dt>Recebido em</dt>
              <dd>
                {{
                  formatarDataRecebimento(
                    arquivo.recebidoEm,
                  )
                }}
              </dd>
            </div>

            <div>
              <dt>Formato</dt>
              <dd>{{ arquivo.formato || 'Não informado' }}</dd>
            </div>

            <div>
              <dt>Tamanho</dt>
              <dd>
                {{
                  formatarTamanhoArquivo(
                    arquivo.tamanhoBytes,
                  )
                }}
              </dd>
            </div>

            <div>
              <dt>Sistema de referência</dt>
              <dd>
                {{
                  arquivo.srid != null
                    ? `EPSG:${arquivo.srid}`
                    : 'Não informado'
                }}
              </dd>
            </div>

            <div>
              <dt>Quantidade de arquivos informada</dt>
              <dd>
                {{ arquivo.qtdArquivos ?? 'Não informada' }}
              </dd>
            </div>

            <div>
              <dt>Situação</dt>
              <dd>
                <span class="recebidos-situacao">
                  {{ arquivo.situacao || 'Não informada' }}
                </span>
              </dd>
            </div>

            <div>
              <dt>Identificador</dt>
              <dd>{{ arquivo.id }}</dd>
            </div>

            <div class="arquivo-detalhe-linha-completa">
              <dt>Descrição</dt>
              <dd>
                {{ arquivo.descricao || 'Não informada' }}
              </dd>
            </div>
          </dl>
        </section>

        <section
          class="recebidos-card"
          aria-labelledby="arquivo-rastreabilidade-titulo"
        >
          <h2 id="arquivo-rastreabilidade-titulo">
            Informações de rastreabilidade
          </h2>

          <dl class="arquivo-detalhe-grade">
            <div class="arquivo-detalhe-linha-completa">
              <dt>Localização registrada</dt>
              <dd class="arquivo-detalhe-localizacao">
                {{ arquivo.caminho || 'Não informada' }}
              </dd>
            </div>
          </dl>

          <p class="arquivo-detalhe-observacao">
            Hash, responsável pelo envio, conjunto de destino
            e histórico de movimentações não estão disponíveis
            na resposta atual da API.
          </p>
        </section>

        <section
          class="recebidos-card"
          aria-labelledby="arquivo-conteudo-titulo"
        >
          <header class="recebidos-resultados-cabecalho">
            <h2 id="arquivo-conteudo-titulo">
              Conteúdo do arquivo
            </h2>

            <span>
              {{ arquivo.arquivos.length }} item(ns)
            </span>
          </header>

          <p
            v-if="!arquivo.arquivos.length"
            class="recebidos-estado"
          >
            Nenhum item interno informado pelo backend.
          </p>

          <div
            v-else
            class="recebidos-tabela-container"
            role="region"
            aria-label="Itens internos do arquivo"
            tabindex="0"
          >
            <table class="recebidos-tabela">
              <caption class="recebidos-somente-leitor">
                Conteúdo informado para o arquivo recebido
              </caption>

              <thead>
                <tr>
                  <th scope="col">Nome</th>
                  <th scope="col">Formato</th>
                  <th scope="col">Tamanho</th>
                  <th scope="col">Descrição</th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="item in arquivo.arquivos"
                  :key="item.id"
                >
                  <th scope="row">
                    {{ item.nome || 'Não informado' }}
                  </th>

                  <td>
                    {{ item.formato || 'Não informado' }}
                  </td>

                  <td>
                    {{
                      formatarTamanhoArquivo(
                        item.tamanhoBytes,
                      )
                    }}
                  </td>

                  <td>
                    {{ item.descricao || 'Não informada' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </main>

    <Teleport to="body">
      <div
        v-if="mensagem"
        class="recebidos-toast"
        role="alert"
        aria-atomic="true"
      >
        <p>{{ mensagem }}</p>

        <button
          type="button"
          aria-label="Fechar notificação"
          @click="fecharMensagem"
        >
          ×
        </button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped src="../assets/css/arquivos-recebidos.css"></style>
<style scoped src="../assets/css/detalhe-arquivo-recebido.css"></style>
