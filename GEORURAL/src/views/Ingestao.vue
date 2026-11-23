
<script setup>
import {
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'

import BarraNavegacao from '../components/BarraNavegacao.vue'
import FormularioEntradaDados from '../components/FormularioEntradaDados.vue'
import SeletorMetodoEntrada from '../components/SeletorMetodoEntrada.vue'
import ToastMensagem from '../components/ToastMensagem.vue'

import {
  criarControleIngestao,
} from '../services/ingestaoControleService'

defineOptions({ name: 'IngestaoPagina' })

const metodo = ref('upload')
const controle = criarControleIngestao()

const {
  fontes,
  conjuntos,
  carregando,
  falhou,
  mensagem,
  tipoMensagem,
  configuracao,
  resultado,
  fonteConfigurada,
  conjuntoConfigurado,
  chaveFormulario,
} = controle

const resultadosUpload = () => {
  if (!Array.isArray(resultado.value)) return []

  return resultado.value
}

const totalAceitos = () =>
  resultadosUpload().filter(item => item.aceito).length

const totalRecusados = () =>
  resultadosUpload().filter(item => !item.aceito).length

watch(metodo, controle.limparResultado)

onMounted(controle.carregar)
onBeforeUnmount(controle.destruir)
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
        :disabled="carregando"
        @click="controle.carregar"
      >
        Tentar carregar fontes e conjuntos novamente
      </button>

      <FormularioEntradaDados
        :key="chaveFormulario"
        v-model:metodo="metodo"
        :fontes="fontes"
        :conjuntos="conjuntos"
        :carregando="carregando"
        @configurar="controle.receberConfiguracao"
        @api-consultada="controle.receberConsultaApi"
        @api-selecionada="controle.receberSelecaoApi"
        @erro="controle.exibirErro"
      />

      <section
        v-if="configuracao && resultado"
        class="ingestao-resumo"
        aria-labelledby="ingestao-resumo-titulo"
        role="status"
      >
        <h2 id="ingestao-resumo-titulo">
          Resultado do recebimento
        </h2>

        <template v-if="configuracao.metodo === 'upload'">
          <p>
            {{ totalAceitos() }} arquivo(s) recebido(s) e
            {{ totalRecusados() }} recusado(s).
          </p>

          <dl>
            <div>
              <dt>Método de entrada</dt>
              <dd>Upload</dd>
            </div>

            <div>
              <dt>Fonte</dt>
              <dd>{{ fonteConfigurada?.nome }}</dd>
            </div>

            <div>
              <dt>Conjunto</dt>
              <dd>{{ conjuntoConfigurado?.nome }}</dd>
            </div>

            <div>
              <dt>Total de arquivos</dt>
              <dd>{{ configuracao.arquivos?.length || 0 }}</dd>
            </div>
          </dl>

          <div class="ingestao-arquivos-resultado">
            <h3>Arquivos enviados</h3>

            <ul>
              <li
                v-for="(item, indice) in resultado"
                :key="item.arquivoId ?? indice"
              >
                <span>
                  {{ configuracao.arquivos?.[indice]?.name || 'Arquivo sem nome' }}
                </span>

                <span
                  :class="item.aceito
                    ? 'ingestao-status-aceito'
                    : 'ingestao-status-recusado'"
                >
                  {{ item.aceito ? 'Recebido' : 'Recusado' }}
                </span>
              </li>
            </ul>
          </div>
        </template>

        <template v-else>
          <p>
            {{ resultado.importados }} item(ns) importado(s),
            {{ resultado.jaRecebidos }} já recebido(s) e
            {{ resultado.falhas }} falha(s).
          </p>

          <dl>
            <div>
              <dt>Método de entrada</dt>
              <dd>API</dd>
            </div>

            <div>
              <dt>Fonte</dt>
              <dd>{{ fonteConfigurada?.nome }}</dd>
            </div>

            <div>
              <dt>Conjunto</dt>
              <dd>{{ conjuntoConfigurado?.nome }}</dd>
            </div>

            <div>
              <dt>Total de itens</dt>
              <dd>{{ resultado.total }}</dd>
            </div>
          </dl>
        </template>
      </section>
    </main>

    <ToastMensagem
      v-if="mensagem"
      :mensagem="mensagem"
      :tipo="tipoMensagem"
      :duracao="tipoMensagem === 'sucesso' ? 6000 : 0"
      @fechar="controle.fecharMensagem"
    />
  </div>
</template>

<style scoped src="../assets/css/ingestao-fontes.css"></style>
