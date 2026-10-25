<script setup>
import { computed, ref, watch } from 'vue'
import ConsultaApiIngestao from './ConsultaApiIngestao.vue'

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
  desabilitado: {
    type: Boolean,
    default: false,
  },
  metodo: {
  type: String,
  default: 'upload',
  validator: valor =>
    ['upload', 'api'].includes(valor),
  },
})

const emit = defineEmits([
  'configurar',
  'api-consultada',
  'api-selecionada',
  'erro',
])

const metodo = computed({
  get: () => props.metodo,
  set: valor => emit('update:metodo', valor),
})

const fonteId = ref('')
const conjuntoId = ref('')
const formato = ref('')
const abrangencia = ref('')
const arquivo = ref(null)

const inputArquivo = ref(null)
const arrastando = ref(false)

const formatos = [
  {
    valor: 'SHAPEFILE',
    nome: 'Shapefile (.zip)',
    extensoes: '.zip',
  },
  {
    valor: 'GEOJSON',
    nome: 'GeoJSON',
    extensoes: '.geojson,.json',
  },
  {
    valor: 'GEOPACKAGE',
    nome: 'GeoPackage',
    extensoes: '.gpkg',
  },
  {
    valor: 'CSV',
    nome: 'CSV',
    extensoes: '.csv',
  },
  {
    valor: 'KML',
    nome: 'KML',
    extensoes: '.kml',
  },
]

const bloqueado = computed(
  () => props.carregando || props.desabilitado,
)

const fontesDisponiveis = computed(() =>
  props.fontes.filter(
    fonte => fonte.ativo === true,
  ),
)

const fonteSelecionada = computed(() =>
  fontesDisponiveis.value.find(
    fonte =>
      String(fonte.id) === String(fonteId.value),
  ) ?? null,
)

const conjuntosDisponiveis = computed(() => {
  if (!fonteSelecionada.value) return []

  return props.conjuntos.filter(
    conjunto =>
      conjunto.ativo === true &&
      String(conjunto.fonteId) ===
        String(fonteSelecionada.value.id) &&
      (
        metodo.value === 'api'
          ? conjunto.api === true
          : conjunto.upload === true
      ),
  )
})

const conjuntoSelecionado = computed(() =>
  conjuntosDisponiveis.value.find(
    conjunto =>
      String(conjunto.id) ===
      String(conjuntoId.value),
  ) ?? null,
)

const formatoSelecionado = computed(() =>
  formatos.find(
    item => item.valor === formato.value,
  ),
)

const tamanhoArquivo = computed(() => {
  if (!arquivo.value) return ''

  const bytes = arquivo.value.size

  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toLocaleString('pt-BR', {
      maximumFractionDigits: 1,
    })} KB`
  }

  return `${(bytes / (1024 * 1024)).toLocaleString('pt-BR', {
    maximumFractionDigits: 1,
  })} MB`
})

const podeContinuar = computed(() => {
  if (
    bloqueado.value ||
    !fonteSelecionada.value ||
    !conjuntoSelecionado.value
  ) {
    return false
  }

  if (metodo.value === 'api') {
    return true
  }

  return Boolean(
    formato.value &&
    abrangencia.value.trim() &&
    arquivo.value,
  )
})

watch(fonteId, () => {
  conjuntoId.value = ''
})

watch(conjuntoSelecionado, conjunto => {
  abrangencia.value = conjunto?.cobertura ?? ''
})

watch(fontesDisponiveis, fontes => {
  const existe = fontes.some(
    fonte =>
      String(fonte.id) === String(fonteId.value),
  )

  if (!existe) {
    fonteId.value = ''
  }
})

watch(conjuntosDisponiveis, conjuntos => {
  const existe = conjuntos.some(
    conjunto =>
      String(conjunto.id) ===
      String(conjuntoId.value),
  )

  if (!existe) {
    conjuntoId.value = ''
  }
})

watch(formato, () => {
  limparArquivo()
})

watch(metodo, () => {
  arrastando.value = false
})

function abrirSeletor() {
  if (
    bloqueado.value ||
    metodo.value !== 'upload'
  ) {
    return
  }

  inputArquivo.value?.click()
}

function selecionarArquivo(evento) {
  if (
    bloqueado.value ||
    metodo.value !== 'upload'
  ) {
    return
  }

  const selecionado = evento.target.files?.[0]

  if (selecionado) {
    arquivo.value = selecionado
  }
}

function receberArquivo(evento) {
  arrastando.value = false

  if (
    bloqueado.value ||
    metodo.value !== 'upload'
  ) {
    return
  }

  const selecionado =
    evento.dataTransfer?.files?.[0]

  if (selecionado) {
    arquivo.value = selecionado
  }
}

function marcarArraste() {
  if (
    bloqueado.value ||
    metodo.value !== 'upload'
  ) {
    return
  }

  arrastando.value = true
}

function limparArquivo() {
  arquivo.value = null

  if (inputArquivo.value) {
    inputArquivo.value.value = ''
  }
}

function removerArquivo() {
  if (bloqueado.value) return

  limparArquivo()
}

function receberConsultaApi(dados) {
  emit('api-consultada', dados)
}

function configurar() {
  if (!podeContinuar.value) return

  const dados = {
    metodo: metodo.value,
    fonteId: fonteSelecionada.value.id,
    conjuntoId: conjuntoSelecionado.value.id,
  }

  if (metodo.value === 'upload') {
    Object.assign(dados, {
      formato: formato.value,
      abrangencia: abrangencia.value.trim(),
      arquivo: arquivo.value,
    })
  }

  emit('configurar', dados)
}
</script>

<template>
  <section
    class="entrada-card"
    aria-labelledby="entrada-titulo"
    :aria-busy="carregando"
  >
    <header class="entrada-cabecalho">
      <h2 id="entrada-titulo">
        Nova ingestão
      </h2>

      <p>
        Escolha a forma de entrada e o conjunto de destino.
      </p>
    </header>

    <p
      v-if="carregando"
      class="entrada-informacao"
      role="status"
    >
      Carregando fontes e conjuntos...
    </p>

    <form @submit.prevent="configurar">
      <fieldset
        class="entrada-campos"
        :disabled="bloqueado"
      >
        <legend class="entrada-somente-leitor">
          Configuração da entrada de dados
        </legend>

        <div class="entrada-grade">
          <div class="entrada-campo">
            <label for="entrada-fonte">
              Fonte de dados
            </label>

            <select
              id="entrada-fonte"
              v-model="fonteId"
              required
              :disabled="!fontesDisponiveis.length"
              aria-describedby="entrada-fonte-ajuda"
            >
              <option value="" disabled>
                Selecione uma fonte
              </option>

              <option
                v-for="fonte in fontesDisponiveis"
                :key="fonte.id"
                :value="fonte.id"
              >
                {{ fonte.sigla }} — {{ fonte.nome }}
              </option>
            </select>

            <p
              id="entrada-fonte-ajuda"
              class="entrada-ajuda"
            >
              {{
                !carregando && !fontesDisponiveis.length
                  ? 'Nenhuma fonte ativa disponível.'
                  : 'Selecione a origem dos dados.'
              }}
            </p>
          </div>

          <div class="entrada-campo">
            <label for="entrada-conjunto">
              Conjunto de destino
            </label>

            <select
              id="entrada-conjunto"
              v-model="conjuntoId"
              required
              :disabled="!conjuntosDisponiveis.length"
              aria-describedby="entrada-conjunto-ajuda"
            >
              <option value="" disabled>
                Selecione um conjunto
              </option>

              <option
                v-for="conjunto in conjuntosDisponiveis"
                :key="conjunto.id"
                :value="conjunto.id"
              >
                {{ conjunto.nome }}
              </option>
            </select>

            <p
              id="entrada-conjunto-ajuda"
              class="entrada-ajuda"
            >
              {{
                !fonteSelecionada
                  ? 'Selecione uma fonte primeiro.'
                  : !conjuntosDisponiveis.length
                    ? 'Esta fonte não possui conjuntos ativos compatíveis com a forma de entrada selecionada.'
                    : 'Conjuntos vinculados à fonte selecionada.'
              }}
            </p>
          </div>
        </div>

        <div v-show="metodo === 'upload'">
          <div class="entrada-grade">
            <div class="entrada-campo">
              <label for="entrada-formato">
                Formato do arquivo
              </label>

              <select
                id="entrada-formato"
                v-model="formato"
                :required="metodo === 'upload'"
                :disabled="metodo !== 'upload'"
              >
                <option value="" disabled>
                  Selecione um formato
                </option>

                <option
                  v-for="item in formatos"
                  :key="item.valor"
                  :value="item.valor"
                >
                  {{ item.nome }}
                </option>
              </select>
            </div>

            <div class="entrada-campo">
              <label for="entrada-abrangencia">
                Abrangência
              </label>

              <input
                id="entrada-abrangencia"
                v-model="abrangencia"
                type="text"
                maxlength="200"
                :required="metodo === 'upload'"
                :disabled="metodo !== 'upload'"
                placeholder="Ex.: Estado do Paraná"
              />
            </div>
          </div>

          <div class="entrada-campo">
            <label for="entrada-arquivo">
              Arquivo
            </label>

            <input
              id="entrada-arquivo"
              ref="inputArquivo"
              class="entrada-somente-leitor"
              type="file"
              tabindex="-1"
              :disabled="metodo !== 'upload'"
              :accept="formatoSelecionado?.extensoes"
              @change="selecionarArquivo"
            />

            <button
              type="button"
              class="entrada-drop"
              :class="{
                'entrada-drop--arrastando': arrastando,
                'entrada-drop--selecionado': arquivo,
              }"
              :disabled="metodo !== 'upload'"
              aria-describedby="entrada-arquivo-ajuda"
              @click="abrirSeletor"
              @dragenter.prevent="marcarArraste"
              @dragover.prevent="marcarArraste"
              @dragleave.prevent="arrastando = false"
              @drop.prevent="receberArquivo"
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
                <path d="M12 16V4" />
                <path d="m7 9 5-5 5 5" />
                <path d="M4 16v4h16v-4" />
              </svg>

              <strong>
                {{
                  arquivo
                    ? arquivo.name
                    : 'Arraste um arquivo ou clique para selecionar'
                }}
              </strong>

              <span>
                {{
                  arquivo
                    ? `${tamanhoArquivo} · Clique para substituir`
                    : 'Selecione o arquivo que deseja importar.'
                }}
              </span>
            </button>

            <p
              id="entrada-arquivo-ajuda"
              class="entrada-ajuda"
            >
              Para Shapefile, utilize um ZIP com os arquivos
              associados.
            </p>

            <button
              v-if="arquivo"
              type="button"
              class="entrada-remover"
              @click="removerArquivo"
            >
              Remover arquivo
            </button>
          </div>
        </div>

        <ConsultaApiIngestao
          v-if="metodo === 'api'"
          :conjunto-id="conjuntoSelecionado?.id ?? null"
          :desabilitado="bloqueado"
          @consultado="receberConsultaApi"
          @selecionar="emit('api-selecionada', $event)"
          @erro="emit('erro', $event)"
        />

        <footer class="entrada-rodape">
          <button
            type="submit"
            class="entrada-botao"
            :disabled="!podeContinuar"
          >
            Continuar
          </button>
        </footer>
      </fieldset>
    </form>
  </section>
</template>

<style scoped src="../assets/css/entrada-dados.css"></style>
