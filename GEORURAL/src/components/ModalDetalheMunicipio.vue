<script setup>
defineOptions({
  name: 'ModalDetalheMunicipio',
})

defineProps({
  municipio: {
    type: Object,
    default: null,
  },
  sigla: {
    type: String,
    required: true,
  },
  ehPercentual: {
    type: Boolean,
    default: false,
  },
  totalComDados: {
    type: Number,
    default: 0,
  },
  totalFaixas: {
    type: Number,
    default: 0,
  },
  corFaixa: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['fechar', 'ver-mapa'])

function fmtNumero(v, casas = 2) {
  if (v === null || v === undefined) return '—'
  return Number(v).toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })
}

function fmtInteiro(v) {
  if (v === null || v === undefined) return '—'
  return Number(v).toLocaleString('pt-BR')
}
</script>

<template>
  <div
    v-if="municipio"
    class="pg-modal"
    role="dialog"
    aria-modal="true"
    @click.self="emit('fechar')"
  >
    <div class="pg-modal-caixa" style="width: min(38rem, 100%)">
      <header>
        <div>
          <h2>{{ municipio.nome }}</h2>
          <p>
            Código IBGE <span class="pg-mono">{{ municipio.ibge }}</span>
            <template v-if="municipio.areaHa !== null && municipio.areaHa !== undefined">
              · {{ fmtNumero(municipio.areaHa, 1) }} ha
            </template>
          </p>
        </div>
        <button type="button" class="pg-botao" @click="emit('fechar')">Fechar</button>
      </header>

      <template v-if="municipio.temDados">
        <div class="mun-modal-meta">
          <div>
            <span>Posição</span>
            <strong>
              {{ municipio.posicao }}º de {{ fmtInteiro(totalComDados) }}
            </strong>
          </div>
          <div>
            <span>{{ sigla }}</span>
            <strong>
              {{ fmtNumero(municipio.valor) }}{{ ehPercentual ? '%' : '' }}
            </strong>
          </div>
          <div>
            <span>Imóveis</span>
            <strong>{{ fmtInteiro(municipio.imoveis) }}</strong>
          </div>
          <div>
            <span>Conformes</span>
            <strong>
              {{ fmtInteiro(municipio.conformes) }}
              ({{ fmtNumero(municipio.pctConf, 1) }}%)
            </strong>
          </div>
        </div>

        <div class="mun-modal-secao">
          <h3>Faixa de classificação</h3>
          <div class="mun-modal-faixa-box">
            <i
              class="mun-fdot mun-fdot--grande"
              :style="{ background: corFaixa }"
            />
            <div>
              <strong>
                {{ municipio.faixaRotulo }}{{ ehPercentual ? '%' : '' }}
              </strong>
              <span>
                Faixa {{ municipio.faixa }} de {{ totalFaixas }}
              </span>
            </div>
          </div>
        </div>

        <div v-if="municipio.ha !== null && municipio.ha !== undefined" class="mun-modal-secao">
          <h3>Área com cobertura</h3>
          <p>
            <strong>{{ fmtNumero(municipio.ha, 1) }} ha</strong>
            somados nos imóveis do município.
          </p>
        </div>
      </template>

      <div v-else class="pg-vazio">
        Este município não possui resultado agregado nesta versão.
      </div>

      <div class="pg-modal-rodape">
        <span class="pg-ajuda" style="margin: 0">Resumo municipal.</span>
        <div class="mun-modal-acoes">
          <button type="button" class="pg-botao" @click="emit('fechar')">
            Fechar
          </button>
          <button
            type="button"
            class="pg-botao pg-botao--principal"
            @click="emit('ver-mapa', municipio)"
          >
            Ver no mapa ↗
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped src="../assets/css/comparacao-municipios.css"></style>
