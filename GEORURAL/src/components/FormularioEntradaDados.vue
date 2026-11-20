
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
    validator: valor => ['upload', 'api'].includes(valor),
  },
})

const emit = defineEmits([
  'update:metodo',
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
const arquivos = ref([])
const inputArquivo = ref(null)
const arrastando = ref(false)
const itensApi = ref([])

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
    valor: 'TIFF',
    nome: 'GeoTIFF',
    extensoes: '.tif,.tiff',
  },
]

const bloqueado = computed(() =>
  props.carregando || props.desabilitado,
)

const fontesDisponiveis = computed(() =>
  props.fontes.filter(fonte => fonte.ativo === true),
)

const fonteSelecionada = computed(() =>
  fontesDisponiveis.value.find(fonte =>
    String(fonte.id) === String(fonteId.value),
  ) ?? null,
)

const conjuntosDisponiveis = computed(() => {
  if (!fonteSelecionada.value) return []

  return props.conjuntos.filter(conjunto =>
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
  conjuntosDisponiveis.value.find(conjunto =>
    String(conjunto.id) === String(conjuntoId.value),
  ) ?? null,
)

const formatoSelecionado = computed(() =>
  formatos.find(item => item.valor === formato.value),
)

const quantidadeArquivos = computed(() =>
  arquivos.value.length,
)

const tamanhoTotalArquivos = computed(() => {
  const total = arquivos.value.reduce(
    (soma, arquivo) => soma + arquivo.size,
    0,
  )

  return formatarTamanho(total)
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
    return itensApi.value.length > 0
  }

  return Boolean(formato.value && arquivos.value.length)
})

function formatarTamanho(bytes) {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`

  const divisor = bytes < 1024 * 1024
    ? 1024
    : bytes < 1024 * 1024 * 1024
      ? 1024 * 1024
      : 1024 * 1024 * 1024

  const unidade = divisor === 1024
    ? 'KB'
    : divisor === 1024 * 1024
      ? 'MB'
      : 'GB'

  return `${(bytes / divisor).toLocaleString('pt-BR', {
    maximumFractionDigits: 1,
  })} ${unidade}`
}

function limparArquivos() {
  arquivos.value = []

  if (inputArquivo.value) {
    inputArquivo.value.value = ''
  }
}

function limparSelecaoApi() {
  itensApi.value = []

  emit('api-consultada', null)
  emit('api-selecionada', [])
}

watch(fonteId, () => {
  conjuntoId.value = ''
  limparArquivos()
  limparSelecaoApi()
})

watch(conjuntoId, () => {
  limparArquivos()
  limparSelecaoApi()
})

watch(conjuntoSelecionado, conjunto => {
  abrangencia.value = conjunto?.cobertura ?? ''
})

watch(metodo, () => {
  arrastando.value = false
  limparArquivos()
  limparSelecaoApi()
})

watch(formato, limparArquivos)

watch(fontesDisponiveis, fontes => {
  const existe = fontes.some(fonte =>
    String(fonte.id) === String(fonteId.value),
  )

  if (!existe) {
    fonteId.value = ''
  }
})

watch(conjuntosDisponiveis, conjuntos => {
  const existe = conjuntos.some(conjunto =>
    String(conjunto.id) === String(conjuntoId.value),
  )

  if (!existe) {
    conjuntoId.value = ''
  }
})

function abrirSeletor() {
  if (bloqueado.value || metodo.value !== 'upload') return

  if (!formatoSelecionado.value) {
    emit(
      'erro',
      'Selecione o formato antes de escolher os arquivos.',
    )
    return
  }

  inputArquivo.value?.click()
}

function validarArquivo(selecionado) {
  const extensoes =
    formatoSelecionado.value?.extensoes.split(',') ?? []

  const formatoValido = extensoes.some(extensao =>
    selecionado.name.toLowerCase().endsWith(extensao),
  )

  if (!formatoValido) {
    emit(
      'erro',
      `O arquivo "${selecionado.name}" não corresponde ao formato selecionado.`,
    )
    return false
  }

  if (!selecionado.size) {
    emit(
      'erro',
      `O arquivo "${selecionado.name}" está vazio.`,
    )
    return false
  }

  return true
}

function aceitarArquivos(selecionados) {
  if (bloqueado.value || metodo.value !== 'upload') return
  if (!selecionados?.length) return

  if (!formatoSelecionado.value) {
    emit(
      'erro',
      'Selecione o formato antes de escolher os arquivos.',
    )
    return
  }

  const novosArquivos = Array.from(selecionados)
  const arquivosValidos = []

  for (const selecionado of novosArquivos) {
    if (!validarArquivo(selecionado)) continue

    const jaExiste = arquivos.value.some(arquivo =>
      arquivo.name === selecionado.name &&
      arquivo.size === selecionado.size &&
      arquivo.lastModified === selecionado.lastModified,
    )

    const jaFoiAdicionado = arquivosValidos.some(arquivo =>
      arquivo.name === selecionado.name &&
      arquivo.size === selecionado.size &&
      arquivo.lastModified === selecionado.lastModified,
    )

    if (!jaExiste && !jaFoiAdicionado) {
      arquivosValidos.push(selecionado)
    }
  }

  if (arquivosValidos.length) {
    arquivos.value = [
      ...arquivos.value,
      ...arquivosValidos,
    ]
  }

  if (
    novosArquivos.length > 0 &&
    arquivosValidos.length === 0 &&
    novosArquivos.every(selecionado =>
      arquivos.value.some(arquivo =>
        arquivo.name === selecionado.name &&
        arquivo.size === selecionado.size &&
        arquivo.lastModified === selecionado.lastModified,
      ),
    )
  ) {
    emit('erro', 'Os arquivos selecionados já foram adicionados.')
  }

  if (inputArquivo.value) {
    inputArquivo.value.value = ''
  }
}

function selecionarArquivo(evento) {
  aceitarArquivos(evento.target.files)
}

function receberArquivo(evento) {
  arrastando.value = false
  aceitarArquivos(evento.dataTransfer?.files)
}

function marcarArraste() {
  if (!bloqueado.value && metodo.value === 'upload') {
    arrastando.value = true
  }
}

function removerArquivo(indice) {
  if (bloqueado.value) return

  arquivos.value = arquivos.value.filter(
    (_, index) => index !== indice,
  )
}

function removerTodosArquivos() {
  if (!bloqueado.value) {
    limparArquivos()
  }
}

function receberConsultaApi(dados) {
  emit('api-consultada', dados)
}

function receberSelecaoApi(itens) {
  itensApi.value = Array.isArray(itens) ? itens : []
  emit('api-selecionada', itensApi.value)
}

function configurar() {
  if (!podeContinuar.value) return

  emit('configurar', {
    metodo: metodo.value,
    fonteId: fonteSelecionada.value.id,
    conjuntoId: conjuntoSelecionado.value.id,

    ...(metodo.value === 'upload'
      ? {
          formato: formato.value,
          abrangencia: abrangencia.value.trim(),
          arquivos: [...arquivos.value],
        }
      : {}),
  })
}
</script>

<template>
  <section
    class="entrada-card"
    aria-labelledby="entrada-titulo"
    :aria-busy="carregando"
  >
    <header class="entrada-cabecalho">
      <h2 id="entrada-titulo">Nova ingestão</h2>

      <p>
        Escolha a forma de entrada e o conjunto de destino.
      </p>
    </header>

    <p
      v-if="carregando"
      class="entrada-informacao"
      role="status"
    >
      Aguarde a conclusão da operação...
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
                    ? 'Nenhum conjunto ativo compatível com esta forma de entrada.'
                    : 'Conjuntos vinculados à fonte selecionada.'
              }}
            </p>
          </div>
        </div>

        <div v-show="metodo === 'upload'">
          <div class="entrada-grade">
            <div class="entrada-campo">
              <label for="entrada-formato">
                Formato dos arquivos
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
                Abrangência (opcional)
              </label>

              <input
                id="entrada-abrangencia"
                v-model="abrangencia"
                type="text"
                maxlength="200"
                :disabled="metodo !== 'upload'"
                placeholder="Ex.: Estado do Paraná"
                aria-describedby="entrada-abrangencia-ajuda"
              />

              <p
                id="entrada-abrangencia-ajuda"
                class="entrada-ajuda"
              >
                Pode deixar vazio. A cobertura armazenada pelo
                servidor é a cadastrada no conjunto.
              </p>
            </div>
          </div>

          <div class="entrada-campo">
            <label for="entrada-arquivo">
              Arquivos
            </label>

            <input
              id="entrada-arquivo"
              ref="inputArquivo"
              class="entrada-somente-leitor"
              type="file"
              multiple
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
                'entrada-drop--selecionado': arquivos.length,
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
                  arquivos.length
                    ? `${quantidadeArquivos} arquivo(s) selecionado(s)`
                    : 'Arraste arquivos ou clique para selecionar'
                }}
              </strong>

              <span>
                {{
                  arquivos.length
                    ? `${tamanhoTotalArquivos} no total · Clique para adicionar mais`
                    : 'Você pode selecionar vários arquivos de uma só vez.'
                }}
              </span>
            </button>

            <p
              id="entrada-arquivo-ajuda"
              class="entrada-ajuda"
            >
              Para Shapefile, utilize arquivos ZIP com os arquivos
              associados. Os arquivos devem corresponder ao formato selecionado.
            </p>

            <div
              v-if="arquivos.length"
              class="entrada-lista-arquivos"
            >
              <div
                class="entrada-lista-arquivos-cabecalho"
              >
                <strong>Arquivos selecionados</strong>

                <button
                  type="button"
                  class="entrada-remover"
                  @click="removerTodosArquivos"
                >
                  Limpar todos
                </button>
              </div>

              <ul>
                <li
                  v-for="(item, indice) in arquivos"
                  :key="`${item.name}-${item.lastModified}-${indice}`"
                  class="entrada-arquivo-item"
                >
                  <div class="entrada-arquivo-informacoes">
                    <strong>{{ item.name }}</strong>

                    <span>
                      {{ formatarTamanho(item.size) }}
                    </span>
                  </div>

                  <button
                    type="button"
                    class="entrada-remover"
                    :aria-label="`Remover ${item.name}`"
                    @click="removerArquivo(indice)"
                  >
                    Remover
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <ConsultaApiIngestao
          v-if="metodo === 'api'"
          :conjunto-id="conjuntoSelecionado?.id ?? null"
          :desabilitado="bloqueado"
          @consultado="receberConsultaApi"
          @selecionar="receberSelecaoApi"
          @erro="emit('erro', $event)"
        />

        <footer class="entrada-rodape">
          <button
            type="submit"
            class="entrada-botao"
            :disabled="!podeContinuar"
          >
            {{
              bloqueado
                ? 'Aguarde...'
                : metodo === 'api'
                  ? 'Importar selecionados'
                  : 'Enviar arquivos'
            }}
          </button>
        </footer>
      </fieldset>
    </form>
  </section>
</template>

<style scoped src="../assets/css/entrada-dados.css"></style>
