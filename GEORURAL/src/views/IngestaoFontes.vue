<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import BarraNavegacao from '../components/BarraNavegacao.vue'
import IconDocumentation from '../components/icons/IconDocumentation.vue'
import IconUpload from '../components/icons/IconUpload.vue'
import ModalProcessamento from '../components/ModalProcessamento.vue'
import { arquivoService } from '../services/arquivoService'

const router = useRouter()

const mostrarArquivos = ref(false)
const mostrarModal = ref(false)
const uploadConcluido = ref(false)
const erroProcessamento = ref(null)
const arquivos = ref([])
const mensagemErro = ref('')
const enviando = ref(false)

const EXTENSOES_ACEITAS = ['.zip', '.gpkg', '.geojson']

function obterExtensao(nomeArquivo) {
  return `.${nomeArquivo.toLowerCase().split('.').pop()}`
}

function formatarData(data) {
  if (!data) return '—'

  const valor = new Date(data)

  return Number.isNaN(valor.getTime())
    ? '—'
    : valor.toLocaleString('pt-BR')
}

async function carregarArquivos() {
  try {
    const dados = await arquivoService.listar()

    arquivos.value = dados
      .slice()
      .sort((a, b) => new Date(b.recebidoEm) - new Date(a.recebidoEm))
      .slice(0, 8)
      .map((arquivo) => ({
        id: arquivo.id,
        nome: arquivo.nomeArquivo || arquivo.nome || 'Arquivo sem nome',
        recebido: formatarData(arquivo.recebidoEm),
        situacao: arquivo.situacao || 'AGUARDANDO',
      }))
  } catch (erro) {
    console.error('Erro ao carregar arquivos:', erro)
    mensagemErro.value = 'Não foi possível carregar os arquivos recentes.'
  }
}

async function handleArquivoSelecionado(event) {
  const selecionados = Array.from(event.target.files || [])
  event.target.value = ''

  if (!selecionados.length || enviando.value) return

  mensagemErro.value = ''

  const validos = selecionados.filter((arquivo) =>
    EXTENSOES_ACEITAS.includes(obterExtensao(arquivo.name))
  )

  const invalidos = selecionados.filter(
    (arquivo) => !EXTENSOES_ACEITAS.includes(obterExtensao(arquivo.name))
  )

  if (invalidos.length) {
    mensagemErro.value =
      `Formato não aceito: ${invalidos.map((arquivo) => arquivo.name).join(', ')}. ` +
      'Envie Shapefile (.zip), GeoPackage (.gpkg) ou GeoJSON.'
  }

  if (!validos.length) return

  enviando.value = true
  uploadConcluido.value = false
  erroProcessamento.value = null
  mostrarModal.value = true

  try {
    const resultados = await arquivoService.enviar(validos)

    const aceitos = resultados.filter((resultado) => resultado.aceito)
    const rejeitados = resultados.filter((resultado) => !resultado.aceito)

    if (rejeitados.length) {
      const nomes = rejeitados
        .map((resultado) => resultado.nomeArquivo)
        .join(', ')

      mensagemErro.value = [
        mensagemErro.value,
        `Rejeitado(s) pelo servidor: ${nomes}.`,
      ]
        .filter(Boolean)
        .join(' ')
    }

    if (aceitos.length) {
      mostrarArquivos.value = true

      await carregarArquivos()

      // Atualiza a situação exibida para os arquivos que o servidor aceitou.
      const nomesAceitos = new Set(
        aceitos.map((resultado) => resultado.nomeArquivo)
      )

      arquivos.value = arquivos.value.map((arquivo) => ({
        ...arquivo,
        situacao: nomesAceitos.has(arquivo.nome)
          ? 'ACEITO'
          : arquivo.situacao,
      }))

      // O modal termina a animação após a resposta bem-sucedida.
      uploadConcluido.value = true
    } else {
      if (!mensagemErro.value) {
        mensagemErro.value = 'O servidor não aceitou os arquivos enviados.'
      }

      erroProcessamento.value = mensagemErro.value
    }
  } catch (erro) {
    console.error('Erro no upload:', erro)

    mensagemErro.value =
      erro.response?.data?.mensagem ||
      erro.response?.data?.message ||
      'Não foi possível enviar os arquivos. Verifique se o backend está em execução.'

    erroProcessamento.value = mensagemErro.value
  } finally {
    enviando.value = false
  }
}

function handleFecharModal() {
  mostrarModal.value = false
}

async function handleProcessamentoFinalizado() {
  mostrarModal.value = false

  if (!router.hasRoute('Resultado')) {
    mensagemErro.value = ''
    return
  }

  await router.push({ name: 'Resultado' })
}

onMounted(carregarArquivos)
</script>

<template>
  <BarraNavegacao />

  <div class="Conteudo">
    <h3>Enviar imóvel rural</h3>
  </div>

  <div class="Card-Upload-Arquivos">
    <div class="Card-Upload-Arquivos-Titulo">
      <IconDocumentation />
      <h2>Upload de Arquivos</h2>
    </div>

    <label
      class="Card-Enviar-Arquivos"
      :class="{ desabilitado: enviando }"
    >
      <p class="Card-Enviar-Arquivos-Titulo">
        <IconUpload class="Card-Enviar-Arquivos-Icone" />
        Arraste o arquivo do imóvel aqui ou clique para selecionar
      </p>

      <p class="Card-Enviar-Arquivos-Subtitulo">
        Formatos aceitos: Shapefile (.zip), GeoPackage (.gpkg) ou GeoJSON
      </p>

      <input
        type="file"
        accept=".zip,.gpkg,.geojson"
        hidden
        multiple
        :disabled="enviando"
        @change="handleArquivoSelecionado"
      />
    </label>

    <p v-if="enviando" class="mensagem-envio">
      Enviando arquivos...
    </p>

    <p v-if="mensagemErro" class="mensagem-erro">
      {{ mensagemErro }}
    </p>

    <hr />

    <div
      class="recent-files"
      @click="mostrarArquivos = !mostrarArquivos"
    >
      <span>Arquivos recentes</span>

      <span
        class="arrow"
        :class="{ 'arrow--open': mostrarArquivos }"
      >
        ›
      </span>
    </div>

    <template v-if="mostrarArquivos">
      <table v-if="arquivos.length" class="tabela-arquivos">
        <thead>
          <tr>
            <th>Arquivo</th>
            <th>Recebido</th>
            <th>Situação</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="arquivo in arquivos" :key="arquivo.id">
            <td class="mono">{{ arquivo.nome }}</td>
            <td class="mono">{{ arquivo.recebido }}</td>
            <td>
              <span
                class="badge"
                :class="`badge--${arquivo.situacao.toLowerCase()}`"
              >
                {{ arquivo.situacao }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-else class="lista-vazia">
        Nenhum arquivo encontrado.
      </p>
    </template>
  </div>

  <div v-if="mostrarModal" class="overlay">
    <ModalProcessamento
      :concluido="uploadConcluido"
      :erro="erroProcessamento"
      @finalizado="handleProcessamentoFinalizado"
      @fechar="handleFecharModal"
    />
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

.overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
}

:global(body) {
  background: #000;
  margin: 0;
}

.Conteudo {
  padding: 32px 24px 16px;
  max-width: 900px;
  margin: 0 auto;
}

.Conteudo h3 {
  font-size: 28px;
  color: #fff;
  margin: 0 0 12px;
  font-family: 'Chakra Petch', sans-serif;
}

.Card-Upload-Arquivos {
  background: #0a0a0f;
  border: 1px solid #b829f7;
  border-radius: 16px;
  padding: 24px;
  color: #fff;
  font-family: sans-serif;
  max-width: 900px;
  margin: 16px auto;
}

.Card-Upload-Arquivos-Titulo {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.Card-Upload-Arquivos-Titulo h2 {
  font-size: 15px;
  margin: 0;
}

.Card-Enviar-Arquivos {
  border: 2px dashed #b829f7;
  border-radius: 12px;
  padding: 56px 24px;
  text-align: center;
  cursor: pointer;
  display: block;
}

.desabilitado {
  opacity: 0.6;
  cursor: wait;
}

.Card-Enviar-Arquivos-Titulo {
  font-weight: bold;
  font-size: 16px;
  margin: 8px 0 4px;
}

.Card-Enviar-Arquivos-Subtitulo {
  color: #9ca3af;
  font-size: 13px;
  margin-top: 4px;
}

.Card-Enviar-Arquivos-Icone {
  display: block;
  margin: 0 auto 18px;
}

.mensagem-envio {
  color: #d8b4fe;
  font-size: 13px;
  margin-top: 12px;
}

.mensagem-erro {
  color: #f87171;
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid rgba(248, 113, 113, 0.4);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  margin-top: 12px;
}

hr {
  border: none;
  border-top: 1px solid #2a2a35;
  margin: 20px 0;
}

.recent-files {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
}

.arrow {
  margin-left: auto;
  color: #b829f7;
  transition: transform 0.2s;
}

.arrow--open {
  transform: rotate(90deg);
}

.tabela-arquivos {
  width: 100%;
  border-collapse: collapse;
  margin-top: 16px;
  font-size: 13px;
}

.tabela-arquivos th {
  text-align: left;
  color: #9ca3af;
  font-weight: 500;
  padding: 8px 12px;
  border-bottom: 1px solid #2a2a35;
}

.tabela-arquivos td {
  padding: 12px;
  border-bottom: 1px solid #1a1a22;
  color: #fff;
}

.mono {
  font-family: 'Courier New', monospace;
}

.badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.badge--aceito {
  color: #4ade80;
  background: rgba(74, 222, 128, 0.1);
}

.badge--rejeitado {
  color: #f87171;
  background: rgba(248, 113, 113, 0.1);
}

.badge--pendente,
.badge--aguardando {
  color: #facc15;
  background: rgba(250, 204, 21, 0.1);
}

.lista-vazia {
  color: #9ca3af;
  font-size: 13px;
  margin-top: 16px;
}
</style>
