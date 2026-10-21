<script setup>
import {
  onBeforeUnmount,
  onMounted,
} from 'vue'

import BarraNavegacao from '../components/BarraNavegacao.vue'
import ToastMensagem from '../components/ToastMensagem.vue'

import {
  criarConsultaQuarentena,
} from '../services/quarentenaConsultaService'

defineOptions({
  name: 'QuarentenaDadosPagina',
})

const {
  execucoes,
  execucaoId,
  registros,
  carregandoExecucoes,
  carregandoRegistros,
  falhouExecucoes,
  falhouRegistros,
  consultado,
  mensagem,
  listaParcial,
  carregarExecucoes,
  selecionarExecucao,
  tentarRegistrosNovamente,
  fecharMensagem,
  destruir,
} = criarConsultaQuarentena()

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
          Consulte os registros rejeitados na validação
          e os motivos informados para cada inconsistência.
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
            @click="carregarExecucoes"
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
            @click="carregarExecucoes"
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

        <div
          v-else
          class="quarentena-campo"
        >
          <label for="quarentena-execucao">
            Selecione uma execução
          </label>

          <select
            id="quarentena-execucao"
            :value="execucaoId"
            @change="
              selecionarExecucao($event.target.value)
            "
          >
            <option value="">
              Selecione
            </option>

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
          >
            {{ registros.length }} registro(s) carregado(s)
          </span>
        </header>

        <p
          v-if="!execucaoId"
          class="quarentena-estado"
        >
          Selecione uma execução para consultar
          os registros em quarentena.
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
          <p
            v-if="listaParcial"
            class="quarentena-ajuda"
          >
            A API retornou apenas uma página dos
            registros desta execução.
          </p>

          <p
            v-if="!registros.length"
            class="quarentena-estado"
          >
            Nenhum registro em quarentena informado
            para esta execução.
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
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="registro in registros"
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
                </tr>
              </tbody>
            </table>
          </div>
        </template>
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

<style scoped src="../assets/css/quarentena-dados.css"></style>
