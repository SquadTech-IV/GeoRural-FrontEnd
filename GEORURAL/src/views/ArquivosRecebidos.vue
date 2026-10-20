<script setup>
import {
  onBeforeUnmount,
  onMounted,
} from 'vue'

import BarraNavegacao from '../components/BarraNavegacao.vue'

import {
  formatarDataRecebimento,
} from '../services/arquivosRecebidosService'

import {
  criarConsultaArquivosRecebidos,
} from '../services/consultaArquivosRecebidosService'

const {
  arquivos,
  nome,
  situacao,
  carregando,
  falhou,
  consultado,
  mensagem,
  consultar,
  limparFiltros,
  fecharMensagem,
  destruir,
} = criarConsultaArquivosRecebidos()

onMounted(consultar)
onBeforeUnmount(destruir)
</script>

<template>
  <div class="recebidos-layout">
    <BarraNavegacao />

    <main class="recebidos-pagina">
      <header class="recebidos-cabecalho">
        <h1>Arquivos recebidos</h1>

        <p>
          Consulte os arquivos cadastrados e acompanhe
          as informações de recebimento.
        </p>
      </header>

      <section
        class="recebidos-card"
        aria-labelledby="recebidos-consulta-titulo"
      >
        <h2 id="recebidos-consulta-titulo">
          Consultar arquivos
        </h2>

        <form
          class="recebidos-filtros"
          @submit.prevent="consultar"
        >
          <div class="recebidos-campo">
            <label for="recebidos-nome">
              Nome do arquivo
            </label>

            <input
              id="recebidos-nome"
              v-model="nome"
              type="search"
              placeholder="Buscar pelo nome"
              :disabled="carregando"
            />
          </div>

          <div class="recebidos-campo">
            <label for="recebidos-situacao">
              Situação
            </label>

            <input
              id="recebidos-situacao"
              v-model="situacao"
              type="text"
              placeholder="Ex.: AGUARDANDO"
              :disabled="carregando"
            />
          </div>

          <div class="recebidos-acoes">
            <button
              type="button"
              class="recebidos-botao"
              :disabled="carregando"
              @click="limparFiltros"
            >
              Limpar
            </button>

            <button
              type="submit"
              class="recebidos-botao recebidos-botao--principal"
              :disabled="carregando"
            >
              {{ carregando ? 'Consultando...' : 'Consultar' }}
            </button>
          </div>
        </form>
      </section>

      <section
        class="recebidos-card"
        aria-labelledby="recebidos-resultados-titulo"
        :aria-busy="carregando"
      >
        <header class="recebidos-resultados-cabecalho">
          <h2 id="recebidos-resultados-titulo">
            Resultado da consulta
          </h2>

          <span v-if="!carregando && !falhou && consultado">
            {{ arquivos.length }}
            {{ arquivos.length === 1 ? 'arquivo' : 'arquivos' }}
          </span>
        </header>

        <p
          v-if="carregando"
          class="recebidos-estado"
          role="status"
        >
          Carregando arquivos recebidos...
        </p>

        <div
          v-else-if="falhou"
          class="recebidos-estado"
        >
          <button
            type="button"
            class="recebidos-botao"
            @click="consultar"
          >
            Tentar novamente
          </button>
        </div>

        <div
          v-else-if="!arquivos.length"
          class="recebidos-estado"
          role="status"
        >
          <strong>Nenhum arquivo encontrado</strong>

          <p>
            Verifique os filtros ou aguarde o cadastro
            de novos arquivos.
          </p>
        </div>

        <div
          v-else
          class="recebidos-tabela-container"
          role="region"
          aria-label="Tabela de arquivos recebidos"
          tabindex="0"
        >
          <table class="recebidos-tabela">
            <caption class="recebidos-somente-leitor">
              Arquivos recebidos retornados pelo backend
            </caption>

            <thead>
              <tr>
                <th scope="col">Arquivo</th>
                <th scope="col">Fonte</th>
                <th scope="col">Formato</th>
                <th scope="col">Itens</th>
                <th scope="col">Situação</th>
                <th scope="col">Recebido em</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="arquivo in arquivos"
                :key="arquivo.id"
              >
                <th scope="row">
                  <span class="recebidos-nome">
                    {{
                      arquivo.nomeArquivo ||
                      arquivo.nome ||
                      'Não informado'
                    }}
                  </span>

                  <small
                    v-if="
                      arquivo.nome &&
                      arquivo.nome !== arquivo.nomeArquivo
                    "
                  >
                    {{ arquivo.nome }}
                  </small>
                </th>

                <td>
                  {{ arquivo.fonte || 'Não informada' }}
                </td>

                <td>
                  {{ arquivo.formato || 'Não informado' }}
                </td>

                <td>
                  {{ arquivo.qtdArquivos ?? 'Não informado' }}
                </td>

                <td>
                  <span class="recebidos-situacao">
                    {{ arquivo.situacao || 'Não informada' }}
                  </span>
                </td>

                <td class="recebidos-data">
                  {{
                    formatarDataRecebimento(
                      arquivo.recebidoEm,
                    )
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
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
