<script setup>
import {
  onBeforeUnmount,
  onMounted,
} from 'vue'

import BarraNavegacao from '../components/BarraNavegacao.vue'
import ToastMensagem from '../components/ToastMensagem.vue'
import HistoricoTransformacoes from '../components/HistoricoTransformacoes.vue'

import {
  criarConsultaZonaTratada,
} from '../services/zonaTratadaConsultaService'

defineOptions({
  name: 'ZonaTratadaDadosPagina',
})

const {
  conjuntos,
  busca,
  selecionado,
  conjuntosFiltrados,
  carregando,
  consultado,
  falhou,
  mensagem,
  listaParcial,
  consultar,
  selecionar,
  limparBusca,
  fecharMensagem,
  destruir,
} = criarConsultaZonaTratada()

function exibirErro(erro) {
  mensagem.value = erro
}

onMounted(consultar)
onBeforeUnmount(destruir)
</script>

<template>
  <div class="tratada-layout">
    <BarraNavegacao />

    <main class="tratada-pagina">
      <header class="tratada-cabecalho">
        <h1>Zona tratada</h1>

        <p>
          Consulte os conjuntos tratados e acompanhe
          o histórico das transformações da execução.
        </p>
      </header>

      <section
        class="tratada-card"
        aria-labelledby="tratada-consulta-titulo"
        :aria-busy="carregando"
      >
        <header class="tratada-secao-cabecalho">
          <h2 id="tratada-consulta-titulo">
            Conjuntos tratados
          </h2>

          <button
            type="button"
            class="tratada-botao"
            :disabled="carregando"
            @click="consultar"
          >
            {{
              carregando
                ? 'Consultando...'
                : 'Atualizar'
            }}
          </button>
        </header>

        <div class="tratada-busca">
          <div class="tratada-campo">
            <label for="tratada-busca">
              Buscar conjunto
            </label>

            <input
              id="tratada-busca"
              v-model="busca"
              type="search"
              placeholder="Conjunto, fonte, tipo ou competência"
              :disabled="carregando"
            />
          </div>

          <button
            type="button"
            class="tratada-botao"
            :disabled="carregando || !busca"
            @click="limparBusca"
          >
            Limpar
          </button>
        </div>

        <p
          v-if="carregando"
          class="tratada-estado"
          role="status"
        >
          Consultando conjuntos tratados...
        </p>

        <div
          v-else-if="falhou"
          class="tratada-estado"
        >
          <button
            type="button"
            class="tratada-botao"
            @click="consultar"
          >
            Tentar novamente
          </button>
        </div>

        <template v-else-if="consultado">
          <p
            v-if="listaParcial"
            class="tratada-ajuda"
          >
            A API retornou uma página dos resultados.
            A busca considera apenas os registros
            carregados.
          </p>

          <p
            class="tratada-contagem"
            role="status"
          >
            {{ conjuntosFiltrados.length }}
            de {{ conjuntos.length }}
            registro(s) carregado(s)
          </p>

          <p
            v-if="!conjuntos.length"
            class="tratada-estado"
          >
            Nenhum conjunto tratado disponível.
          </p>

          <p
            v-else-if="!conjuntosFiltrados.length"
            class="tratada-estado"
          >
            Nenhum conjunto encontrado para esta busca.
          </p>

          <div
            v-else
            class="tratada-tabela-container"
            role="region"
            aria-label="Conjuntos da zona tratada"
            tabindex="0"
          >
            <table class="tratada-tabela">
              <thead>
                <tr>
                  <th scope="col">Conjunto</th>
                  <th scope="col">Fonte</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Competência</th>
                  <th scope="col">Situação</th>
                  <th scope="col">Consulta</th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="conjunto in conjuntosFiltrados"
                  :key="conjunto.chave"
                  :class="{
                    'tratada-linha--selecionada':
                      selecionado?.chave === conjunto.chave,
                  }"
                >
                  <th scope="row">
                    {{ conjunto.nome }}
                  </th>

                  <td>{{ conjunto.fonte }}</td>
                  <td>{{ conjunto.tipo }}</td>
                  <td>{{ conjunto.competencia }}</td>

                  <td>
                    <span class="tratada-situacao">
                      {{ conjunto.situacao }}
                    </span>
                  </td>

                  <td>
                    <button
                      type="button"
                      class="tratada-botao"
                      :aria-pressed="
                        selecionado?.chave === conjunto.chave
                      "
                      @click="selecionar(conjunto)"
                    >
                      Selecionar
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </section>

      <section
        v-if="selecionado"
        class="tratada-card"
        aria-labelledby="tratada-selecionado-titulo"
      >
        <h2 id="tratada-selecionado-titulo">
          Conjunto selecionado
        </h2>

        <dl class="tratada-resumo">
          <div>
            <dt>Conjunto</dt>
            <dd>{{ selecionado.nome }}</dd>
          </div>

          <div>
            <dt>Fonte</dt>
            <dd>{{ selecionado.fonte }}</dd>
          </div>

          <div>
            <dt>Tipo</dt>
            <dd>{{ selecionado.tipo }}</dd>
          </div>

          <div>
            <dt>Competência</dt>
            <dd>{{ selecionado.competencia }}</dd>
          </div>

          <div>
            <dt>Situação</dt>
            <dd>{{ selecionado.situacao }}</dd>
          </div>
        </dl>

        <HistoricoTransformacoes
          :key="selecionado.chave"
          :execucao-id="selecionado.execucaoId"
          @erro="exibirErro"
        />
      </section>
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

<style scoped src="../assets/css/zona-tratada-dados.css"></style>
