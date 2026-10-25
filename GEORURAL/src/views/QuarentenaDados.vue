<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

import BarraNavegacao from '../components/BarraNavegacao.vue'
import ToastMensagem from '../components/ToastMensagem.vue'
import DetalheRegistroQuarentena from '../components/DetalheRegistroQuarentena.vue'
import ExportarQuarentena from '../components/ExportarQuarentena.vue'

import {
  criarConsultaQuarentena,
} from '../services/quarentenaConsultaService'

import {
  validarIdQuarentena,
} from '../services/quarentenaService'

defineOptions({
  name: 'QuarentenaDadosPagina',
})

const {
  execucoes,
  execucaoId,
  registros,
  busca,
  tipoSelecionado,
  ordenacao,
  tiposDisponiveis,
  filtrosAtivos,
  registrosFiltrados,
  carregandoExecucoes,
  carregandoRegistros,
  falhouExecucoes,
  falhouRegistros,
  consultado,
  mensagem,
  listaParcial,
  paginaExecucoes,
  totalPaginasExecucoes,
  totalExecucoes,
  paginaRegistros,
  totalPaginasRegistros,
  totalRegistros,
  carregarExecucoes,
  selecionarExecucao,
  tentarRegistrosNovamente,
  limparFiltros,
  fecharMensagem,
  destruir,
} = criarConsultaQuarentena()

const registroDetalhadoId = ref(null)
const registroDetalhado = ref(null)

function abrirDetalhe(registro) {
  try {
    registroDetalhadoId.value = validarIdQuarentena(registro.id)
    registroDetalhado.value = registro.original
  } catch (erro) {
    mensagem.value = erro.message
  }
}

function fecharDetalhe() {
  registroDetalhadoId.value = null
  registroDetalhado.value = null
}

function exibirErro(erro) {
  mensagem.value = erro
}

function alterarExecucao(evento) {
  fecharDetalhe()
  selecionarExecucao(evento.target.value)
}

function atualizarExecucoes() {
  fecharDetalhe()
  carregarExecucoes()
}

function mudarPaginaExecucoes(pagina) {
  fecharDetalhe()
  carregarExecucoes(pagina)
}

function mudarPaginaRegistros(pagina) {
  fecharDetalhe()

  selecionarExecucao(execucaoId.value, {
    preservarFiltros: true,
    pagina,
  })
}

onMounted(carregarExecucoes)
onBeforeUnmount(destruir)
</script>

<template>
  <div class="quarentena-layout">
    <BarraNavegacao />

    <main class="quarentena-pagina">
      <header class="quarentena-cabecalho">
        <h1>Registros em quarentena</h1>

        <p>
          Consulte os registros rejeitados, filtre as inconsistências,
          confira os detalhes e exporte os registros filtrados.
        </p>
      </header>

      <section
        class="quarentena-card"
        aria-labelledby="quarentena-execucao-titulo"
        :aria-busy="carregandoExecucoes"
      >
        <header class="quarentena-secao-cabecalho">
          <h2 id="quarentena-execucao-titulo">
            Execução da validação
          </h2>

          <button
            type="button"
            class="quarentena-botao"
            :disabled="carregandoExecucoes"
            @click="atualizarExecucoes"
          >
            Atualizar execuções
          </button>
        </header>

        <p
          v-if="carregandoExecucoes"
          class="quarentena-estado"
          role="status"
        >
          Consultando execuções...
        </p>

        <div
          v-else-if="falhouExecucoes"
          class="quarentena-estado"
        >
          <button
            type="button"
            class="quarentena-botao"
            @click="atualizarExecucoes"
          >
            Tentar novamente
          </button>
        </div>

        <p
          v-else-if="!execucoes.length"
          class="quarentena-estado"
        >
          Nenhuma execução disponível para consulta.
        </p>

        <div v-else class="quarentena-campo">
          <label for="quarentena-execucao">
            Selecione uma execução
          </label>

          <select
            id="quarentena-execucao"
            :value="execucaoId"
            @change="alterarExecucao"
          >
            <option value="">Selecione</option>

            <option
              v-for="execucao in execucoes"
              :key="execucao.id"
              :value="execucao.id"
            >
              {{ execucao.nome }}
            </option>
          </select>
        </div>
      </section>

      <nav
        v-if="totalPaginasExecucoes > 1"
        class="quarentena-secao-cabecalho"
        aria-label="Páginas de execuções"
      >
        <button
          type="button"
          class="quarentena-botao"
          :disabled="carregandoExecucoes || paginaExecucoes === 0"
          @click="mudarPaginaExecucoes(paginaExecucoes - 1)"
        >
          Anteriores
        </button>

        <span class="quarentena-contagem" role="status">
          Execuções: página {{ paginaExecucoes + 1 }}
          de {{ totalPaginasExecucoes }} ·
          {{ totalExecucoes }} no total
        </span>

        <button
          type="button"
          class="quarentena-botao"
          :disabled="
            carregandoExecucoes ||
            paginaExecucoes + 1 >= totalPaginasExecucoes
          "
          @click="mudarPaginaExecucoes(paginaExecucoes + 1)"
        >
          Próximas
        </button>
      </nav>

      <section
        class="quarentena-card"
        aria-labelledby="quarentena-listagem-titulo"
        :aria-busy="carregandoRegistros"
      >
        <header class="quarentena-secao-cabecalho">
          <h2 id="quarentena-listagem-titulo">
            Registros rejeitados
          </h2>

          <span
            v-if="consultado"
            class="quarentena-contagem"
            role="status"
          >
            {{ registrosFiltrados.length }}
            de {{ registros.length }} registro(s) carregado(s) ·
            {{ totalRegistros }} no total da execução
          </span>
        </header>

        <p v-if="!execucaoId" class="quarentena-estado">
          Selecione uma execução para consultar os registros em quarentena.
        </p>

        <p
          v-else-if="carregandoRegistros"
          class="quarentena-estado"
          role="status"
        >
          Consultando registros...
        </p>

        <div
          v-else-if="falhouRegistros"
          class="quarentena-estado"
        >
          <button
            type="button"
            class="quarentena-botao"
            @click="tentarRegistrosNovamente"
          >
            Tentar novamente
          </button>
        </div>

        <template v-else-if="consultado">
          <ExportarQuarentena
            :registros="registrosFiltrados"
            :execucao-id="execucaoId"
            :desabilitado="carregandoRegistros"
            :lista-parcial="listaParcial"
            @erro="exibirErro"
          />

          <p v-if="listaParcial" class="quarentena-ajuda">
            A API retornou uma página dos registros. Os filtros e a exportação
            consideram somente os registros carregados.
          </p>

          <p v-if="!registros.length" class="quarentena-estado">
            Nenhum registro em quarentena informado para esta execução.
          </p>

          <template v-else>
            <div class="quarentena-filtros">
              <div class="quarentena-filtro-campo">
                <label for="quarentena-busca">
                  Buscar registro
                </label>

                <input
                  id="quarentena-busca"
                  v-model="busca"
                  type="search"
                  placeholder="Registro, campo ou motivo"
                />
              </div>

              <div class="quarentena-filtro-campo">
                <label for="quarentena-tipo">
                  Tipo de inconsistência
                </label>

                <select
                  id="quarentena-tipo"
                  v-model="tipoSelecionado"
                >
                  <option value="">Todos os tipos</option>

                  <option
                    v-for="tipo in tiposDisponiveis"
                    :key="tipo.valor"
                    :value="tipo.valor"
                  >
                    {{ tipo.nome }} ({{ tipo.quantidade }})
                  </option>
                </select>
              </div>

              <div class="quarentena-filtro-campo">
                <label for="quarentena-ordenacao">
                  Ordenar por
                </label>

                <select
                  id="quarentena-ordenacao"
                  v-model="ordenacao"
                >
                  <option value="linha">Linha crescente</option>
                  <option value="linha_desc">Linha decrescente</option>
                  <option value="motivo">Motivo</option>
                </select>
              </div>

              <button
                type="button"
                class="quarentena-botao"
                :disabled="!filtrosAtivos"
                @click="limparFiltros"
              >
                Limpar filtros
              </button>
            </div>

            <p
              v-if="!registrosFiltrados.length"
              class="quarentena-estado"
            >
              Nenhum registro encontrado com os filtros selecionados.
            </p>

            <div
              v-else
              class="quarentena-tabela-container"
              role="region"
              aria-label="Registros rejeitados na validação"
              tabindex="0"
            >
              <table class="quarentena-tabela">
                <thead>
                  <tr>
                    <th scope="col">Linha</th>
                    <th scope="col">Registro</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Campo</th>
                    <th scope="col">Motivo</th>
                    <th scope="col">Situação</th>
                    <th scope="col">Detalhes</th>
                  </tr>
                </thead>

                <tbody>
                  <tr
                    v-for="registro in registrosFiltrados"
                    :key="registro.chave"
                  >
                    <td>{{ registro.linha }}</td>

                    <th scope="row">
                      {{ registro.identificador }}
                    </th>

                    <td>{{ registro.tipo }}</td>
                    <td>{{ registro.campo }}</td>

                    <td class="quarentena-motivo">
                      {{ registro.motivo }}
                    </td>

                    <td>
                      <span class="quarentena-situacao">
                        {{ registro.situacao }}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        class="quarentena-botao"
                        :disabled="registro.id == null"
                        :aria-label="
                          `Consultar inconsistência da linha ${registro.linha}`
                        "
                        @click="abrirDetalhe(registro)"
                      >
                        Ver detalhes
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </template>
      </section>

      <nav
        v-if="consultado && totalPaginasRegistros > 1"
        class="quarentena-secao-cabecalho"
        aria-label="Páginas de registros em quarentena"
      >
        <button
          type="button"
          class="quarentena-botao"
          :disabled="carregandoRegistros || paginaRegistros === 0"
          @click="mudarPaginaRegistros(paginaRegistros - 1)"
        >
          Anterior
        </button>

        <span class="quarentena-contagem" role="status">
          Página {{ paginaRegistros + 1 }}
          de {{ totalPaginasRegistros }}
        </span>

        <button
          type="button"
          class="quarentena-botao"
          :disabled="
            carregandoRegistros ||
            paginaRegistros + 1 >= totalPaginasRegistros
          "
          @click="mudarPaginaRegistros(paginaRegistros + 1)"
        >
          Próxima
        </button>
      </nav>
    </main>

    <DetalheRegistroQuarentena
      v-if="registroDetalhadoId !== null"
      :key="registroDetalhadoId"
      :registro-id="registroDetalhadoId"
      :registro="registroDetalhado"
      @fechar="fecharDetalhe"
      @erro="exibirErro"
    />

    <ToastMensagem
      v-if="mensagem"
      :mensagem="mensagem"
      tipo="erro"
      :duracao="0"
      @fechar="fecharMensagem"
    />
  </div>
</template>

<style scoped src="../assets/css/quarentena-dados.css"></style>
