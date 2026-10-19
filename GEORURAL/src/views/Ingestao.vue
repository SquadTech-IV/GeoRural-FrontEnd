<script setup>
import { computed, ref } from 'vue'
import BarraNavegacao from '@/components/BarraNavegacao.vue'
import FormularioEntradaDados from '../components/FormularioEntradaDados.vue'

defineOptions({
  name: 'IngestaoPagina',
})

const props = defineProps({
  fontes: {
    type: Array,
    default: () => [],
  },
  conjuntos: {
    type: Array,
    default: () => [],
  },
  carregando: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['configurar'])

const configuracao = ref(null)

const fonteConfigurada = computed(() =>
  props.fontes.find(
    fonte =>
      String(fonte.id) ===
      String(configuracao.value?.fonteId),
  ) ?? null,
)

const conjuntoConfigurado = computed(() =>
  props.conjuntos.find(
    conjunto =>
      String(conjunto.id) ===
      String(configuracao.value?.conjuntoId),
  ) ?? null,
)

function receberConfiguracao(dados) {
  configuracao.value = dados
  emit('configurar', dados)
}
</script>

<template>
  <div class="ingestao-layout">
    <BarraNavegacao />

    <main class="ingestao-pagina">
      <header class="ingestao-cabecalho">
        <h1>Ingestão de fontes</h1>

        <p>
          Configure a entrada dos dados e selecione o conjunto
          de destino no GeoDataLake.
        </p>
      </header>

      <FormularioEntradaDados
        :fontes="fontes"
        :conjuntos="conjuntos"
        :carregando="carregando"
        @configurar="receberConfiguracao"
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
            configuracao.metodo === 'upload'
              ? 'O arquivo foi selecionado. Nenhum dado foi enviado ao servidor.'
              : 'A entrada por API foi selecionada. Nenhuma conexão foi executada.'
          }}
        </p>

        <dl>
          <div>
            <dt>Método de entrada</dt>

            <dd>
              {{
                configuracao.metodo === 'upload'
                  ? 'Upload'
                  : 'API'
              }}
            </dd>
          </div>

          <template v-if="configuracao.metodo === 'upload'">
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
                {{ fonteConfigurada?.nome ?? 'Fonte selecionada' }}
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
  </div>
</template>

<style scoped src="../assets/css/ingestao-fontes.css"></style>
