<script setup>
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'

import BarraNavegacao from '../components/BarraNavegacao.vue'
import ToastMensagem from '../components/ToastMensagem.vue'
import ArquivosOrigemAuditoria from '../components/ArquivosOrigemAuditoria.vue'
import LinhaTempoExecucao from '../components/LinhaTempoExecucao.vue'
import DetalheExecucaoAuditoria from '../components/DetalheExecucaoAuditoria.vue'

import {
  criarConsultaAuditoria,
} from '../services/auditoriaConsultaService'

import { auditoriaService, requisicaoAuditoriaCancelada } from '../services/auditoriaService'

defineOptions({
  name: 'AuditoriaDadosPagina',
})

const {
  busca,
  indicador,
  indicadores,
  resultadosFiltrados,
  selecionado,
  carregando,
  falhou,
  consultado,
  mensagem,
  listaParcial,
  consultar,
  selecionar,
  fecharMensagem,
  destruir,
} = criarConsultaAuditoria()

const trilha = ref(null)
const carregandoTrilha = ref(false)
const falhouTrilha = ref(false)
let consultaTrilha = null

const dadosExecucao = computed(() => {
  if (!trilha.value) return null
  const execucao = trilha.value.execucao ?? trilha.value
  return {
    ...execucao,
    eventos: trilha.value.eventos ?? trilha.value.etapas ?? execucao.eventos ?? execucao.etapas,
  }
})
const execucaoSelecionada = computed(() =>
  trilha.value?.execucao?.id ?? trilha.value?.execucaoId ??
  selecionado.value?.original?.execucaoId ?? selecionado.value?.original?.execucao?.id ?? null,
)

async function carregarTrilha() {
  consultaTrilha?.abort()
  trilha.value = null
  falhouTrilha.value = false
  carregandoTrilha.value = false
  if (!selecionado.value) return
  const atual = new AbortController()
  consultaTrilha = atual
  carregandoTrilha.value = true
  try {
    const dados = await auditoriaService.consultarLinhagem(
      selecionado.value.id,
      { signal: atual.signal },
    )
    if (!atual.signal.aborted && consultaTrilha === atual) trilha.value = dados
  } catch (erro) {
    if (!atual.signal.aborted && consultaTrilha === atual && !requisicaoAuditoriaCancelada(erro)) {
      falhouTrilha.value = true
      exibirErro(erro.message)
    }
  } finally {
    if (consultaTrilha === atual) carregandoTrilha.value = false
  }
}

watch(selecionado, carregarTrilha)

function exibirErro(erro) {
  mensagem.value = erro
}

onMounted(consultar)
onBeforeUnmount(() => {
  destruir()
  consultaTrilha?.abort()
})
</script>

<template>
  <div class="auditoria-layout">
    <BarraNavegacao />

    <main class="auditoria-pagina">
      <header class="auditoria-cabecalho">
        <h1>Linhagem e auditoria</h1>

        <p>
          Consulte os resultados, os arquivos de origem,
          a linha do tempo e os detalhes da execução.
        </p>
      </header>

      <section
        class="auditoria-card"
        aria-labelledby="auditoria-consulta-titulo"
        :aria-busy="carregando"
      >
        <header class="auditoria-secao-cabecalho">
          <h2 id="auditoria-consulta-titulo">
            Consulta dos resultados
          </h2>

          <button
            type="button"
            class="auditoria-botao"
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

        <div class="auditoria-filtros">
          <div class="auditoria-campo">
            <label for="auditoria-busca">
              Buscar resultado
            </label>

            <input
              id="auditoria-busca"
              v-model="busca"
              type="search"
              placeholder="Digite um trecho do CAR"
            />
          </div>

          <div class="auditoria-campo">
            <label for="auditoria-indicador">
              Indicador
            </label>

            <select
              id="auditoria-indicador"
              v-model="indicador"
              :disabled="carregando"
            >
              <option value="">
                Todos os indicadores
              </option>

              <option
                v-for="sigla in indicadores"
                :key="sigla"
                :value="sigla"
              >
                {{ sigla }}
              </option>
            </select>
          </div>
        </div>

        <p
          v-if="carregando"
          class="auditoria-estado"
          role="status"
        >
          Consultando os resultados...
        </p>

        <div
          v-else-if="falhou"
          class="auditoria-estado"
        >
          <button
            type="button"
            class="auditoria-botao"
            @click="consultar"
          >
            Tentar novamente
          </button>
        </div>

        <template v-else-if="consultado">
          <p
            v-if="listaParcial"
            class="auditoria-ajuda"
          >
            A API retornou uma página dos resultados.
            Os filtros são aplicados pelo servidor.
          </p>

          <p
            class="auditoria-contagem"
            role="status"
          >
            {{ resultadosFiltrados.length }}
            resultado(s) encontrado(s)
          </p>

          <p
            v-if="!resultadosFiltrados.length"
            class="auditoria-estado"
          >
            Nenhum resultado encontrado.
          </p>

          <div
            v-else
            class="auditoria-tabela-container"
            role="region"
            aria-label="Resultados da auditoria"
            tabindex="0"
          >
            <table class="auditoria-tabela">
              <thead>
                <tr>
                  <th scope="col">Imóvel</th>
                  <th scope="col">CAR</th>
                  <th scope="col">Indicador</th>
                  <th scope="col">Valor</th>
                  <th scope="col">Consulta</th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="item in resultadosFiltrados"
                  :key="item.chave"
                  :class="{
                    'auditoria-linha--selecionada':
                      selecionado?.chave === item.chave,
                  }"
                >
                  <th scope="row">
                    {{ item.imovel }}
                  </th>

                  <td>
                    {{ item.car || 'Não informado' }}
                  </td>

                  <td>
                    {{ item.indicador }}
                  </td>

                  <td>
                    {{ item.valor ?? 'Não informado' }}
                  </td>

                  <td>
                    <button
                      type="button"
                      class="auditoria-botao"
                      :aria-pressed="
                        selecionado?.chave === item.chave
                      "
                      @click="selecionar(item)"
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
        class="auditoria-card"
        aria-labelledby="auditoria-selecionado-titulo"
      >
        <h2 id="auditoria-selecionado-titulo">
          Resultado selecionado
        </h2>

        <dl class="auditoria-resumo">
          <div>
            <dt>Imóvel</dt>

            <dd>
              {{ selecionado.imovel }}
            </dd>
          </div>

          <div>
            <dt>CAR</dt>

            <dd>
              {{ selecionado.car || 'Não informado' }}
            </dd>
          </div>

          <div>
            <dt>Indicador</dt>

            <dd>
              {{ selecionado.indicador }}
            </dd>
          </div>

          <div>
            <dt>Valor</dt>

            <dd>
              {{ selecionado.valor ?? 'Não informado' }}
            </dd>
          </div>
        </dl>

        <p v-if="carregandoTrilha" role="status">Consultando a trilha completa...</p>
        <button v-else-if="falhouTrilha" type="button" class="auditoria-botao" @click="carregarTrilha">
          Tentar consultar a trilha novamente
        </button>

        <template v-if="trilha">
          <ArquivosOrigemAuditoria
            :dados="trilha"
            :key="`origens-${selecionado.chave}`"
            :resultado-id="selecionado.id"
            @erro="exibirErro"
          />

          <LinhaTempoExecucao
            :dados="dadosExecucao"
            :key="`execucao-${selecionado.chave}`"
            :execucao-id="execucaoSelecionada"
            @erro="exibirErro"
          />

          <DetalheExecucaoAuditoria
            :dados="dadosExecucao"
            :key="`detalhe-${selecionado.chave}`"
            :execucao-id="execucaoSelecionada"
            @erro="exibirErro"
          />
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

<style scoped src="../assets/css/auditoria-dados.css"></style>
