<script setup>
import {
  onBeforeUnmount,
  onMounted,
  ref,
} from 'vue'

import BarraNavegacao from '../components/BarraNavegacao.vue'
import FormularioEntradaDados from '../components/FormularioEntradaDados.vue'
import SeletorMetodoEntrada from '../components/SeletorMetodoEntrada.vue'
import ToastMensagem from '../components/ToastMensagem.vue'

import {
  criarControleIngestao,
} from '../services/ingestaoControleService'

defineOptions({
  name: 'IngestaoPagina',
})

const metodo = ref('upload')

const {
  fontes,
  conjuntos,
  carregando,
  falhou,
  mensagem,
  configuracao,
  fonteConfigurada,
  conjuntoConfigurado,
  carregar,
  receberConfiguracao,
  receberConsultaApi,
  receberSelecaoApi,
  exibirErro,
  fecharMensagem,
  destruir,
} = criarControleIngestao()

onMounted(carregar)
onBeforeUnmount(destruir)
</script>

<template>
  <div class="ingestao-layout">
    <BarraNavegacao />

    <main class="ingestao-pagina">
      <header class="ingestao-cabecalho">
        <h1>Ingestão de fontes</h1>

        <p>
          Configure a entrada dos dados e selecione
          o conjunto de destino no GeoDataLake.
        </p>
      </header>

      <SeletorMetodoEntrada
        v-model="metodo"
        :desabilitado="carregando"
      />

      <button
        v-if="falhou"
        type="button"
        class="ingestao-tentar"
        @click="carregar"
      >
        Tentar carregar fontes e conjuntos novamente
      </button>

      <FormularioEntradaDados
        v-model:metodo="metodo"
        :fontes="fontes"
        :conjuntos="conjuntos"
        :carregando="carregando"
        @configurar="receberConfiguracao"
        @api-consultada="receberConsultaApi"
        @api-selecionada="receberSelecaoApi"
        @erro="exibirErro"
      />

      <section
        v-if="configuracao"
        class="ingestao-resumo"
        aria-labelledby="ingestao-resumo-titulo"
        role="status"
      >
        <h2 id="ingestao-resumo-titulo">
          Configuração preparada
        </h2>

        <p>
          {{
            configuracao.metodo === 'api'
              ? 'A configuração por API foi preparada. Consultar a disponibilidade não importa os itens.'
              : 'O arquivo foi selecionado. Nenhum dado foi enviado ao servidor.'
          }}
        </p>

        <dl>
          <div>
            <dt>Método de entrada</dt>

            <dd>
              {{
                configuracao.metodo === 'api'
                  ? 'API'
                  : 'Upload'
              }}
            </dd>
          </div>

          <template
            v-if="configuracao.metodo !== 'api'"
          >
            <div>
              <dt>Arquivo</dt>
              <dd>{{ configuracao.arquivo?.name }}</dd>
            </div>

            <div>
              <dt>Formato</dt>
              <dd>{{ configuracao.formato }}</dd>
            </div>

            <div>
              <dt>Abrangência</dt>
              <dd>{{ configuracao.abrangencia }}</dd>
            </div>
          </template>

          <template v-else>
            <div>
              <dt>Fonte</dt>

              <dd>
                {{
                  fonteConfigurada?.nome ??
                  'Fonte selecionada'
                }}
              </dd>
            </div>

            <div>
              <dt>Conjunto</dt>

              <dd>
                {{
                  conjuntoConfigurado?.nome ??
                  'Conjunto selecionado'
                }}
              </dd>
            </div>
          </template>
        </dl>
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

<style scoped src="../assets/css/ingestao-fontes.css"></style>
