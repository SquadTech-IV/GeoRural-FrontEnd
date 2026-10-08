<script setup>
import { onMounted, ref } from 'vue'
import BarraNavegacao from '../components/BarraNavegacao.vue'
import IconDocumentation from '../components/icons/IconDocumentation.vue'
import IconUpload from '../components/icons/IconUpload.vue'
import { arquivoService } from '../services/arquivoService'

const mostrarArquivos = ref(false)
const arquivos = ref([])
const mensagemErro = ref('')
const mensagemSucesso = ref('')
const enviando = ref(false)

const EXTENSOES_ACEITAS = ['.zip', '.gpkg', '.geojson']

function obterExtensao(nomeArquivo) {
  return `.${nomeArquivo.toLowerCase().split('.').pop()}`
}

function formatarData(data) {
  if (!data) return '—'

  // O backend envia LocalDateTime sem fuso, como
  // "2026-09-28T22:29:29". Para exibir só a data cadastrada,
  // não é necessário converter fusos horários.
  const partes = String(data).match(/^(\d{4})-(\d{2})-(\d{2})/)

  if (!partes) return '—'

  return `${partes[3]}/${partes[2]}/${partes[1]}`
}

async function carregarArquivos() {
  try {
    const dados = await arquivoService.listar()

    arquivos.value = dados
      .slice()
      .sort(
        (a, b) =>
          new Date(b.recebidoEm) - new Date(a.recebidoEm)
      )
      .slice(0, 8)
      .map((arquivo) => ({
        id: arquivo.id,
        nome:
          arquivo.nomeArquivo ||
          arquivo.nome ||
          'Arquivo sem nome',
        recebidoEm: arquivo.recebidoEm,
      }))
  } catch (erro) {
    console.error('Erro ao carregar arquivos:', erro)
    mensagemErro.value =
      'Não foi possível carregar os arquivos recentes.'
  }
}

async function handleArquivoSelecionado(event) {
  const selecionados = Array.from(event.target.files || [])
  event.target.value = ''

  if (!selecionados.length || enviando.value) return

  mensagemErro.value = ''
  mensagemSucesso.value = ''

  const validos = selecionados.filter((arquivo) =>
    EXTENSOES_ACEITAS.includes(obterExtensao(arquivo.name))
  )

  const invalidos = selecionados.filter(
    (arquivo) =>
      !EXTENSOES_ACEITAS.includes(obterExtensao(arquivo.name))
  )

  if (invalidos.length) {
    mensagemErro.value =
      `Formato não aceito: ${invalidos
        .map((arquivo) => arquivo.name)
        .join(', ')}. ` +
      'Envie Shapefile (.zip), GeoPackage (.gpkg) ou GeoJSON.'
  }

  if (!validos.length) return

  enviando.value = true

  try {
    const resultados = await arquivoService.enviar(validos)

    const aceitos = resultados.filter(
      (resultado) => resultado.aceito
    )

    const rejeitados = resultados.filter(
      (resultado) => !resultado.aceito
    )

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
      mensagemSucesso.value =
        aceitos.length === 1
          ? 'Arquivo enviado com sucesso.'
          : `${aceitos.length} arquivos enviados com sucesso.`

      mostrarArquivos.value = true
      await carregarArquivos()
    } else if (!mensagemErro.value) {
      mensagemErro.value =
        'O servidor não aceitou os arquivos enviados.'
    }
  } catch (erro) {
    console.error('Erro no upload:', erro)

    mensagemErro.value =
      erro.response?.data?.mensagem ||
      erro.response?.data?.message ||
      'Não foi possível enviar os arquivos. Verifique se o backend está em execução.'
  } finally {
    enviando.value = false
  }
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
        Formatos aceitos: Shapefile (.zip), GeoPackage (.gpkg)
        ou GeoJSON
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

    <p v-if="mensagemErro" class="mensagem-erro" role="alert">
      {{ mensagemErro }}
    </p>

    <p v-if="mensagemSucesso" class="mensagem-sucesso" role="status">
      {{ mensagemSucesso }}
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
            <th>Recebido em</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="arquivo in arquivos" :key="arquivo.id">
            <td class="mono">{{ arquivo.nome }}</td>
            <td class="mono">
              {{ formatarData(arquivo.recebidoEm) }}
            </td>
          </tr>
        </tbody>
      </table>

      <p v-else class="lista-vazia">
        Nenhum arquivo encontrado.
      </p>
    </template>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

:global(body) {
  margin: 0;
  background: #000;
}

.Conteudo {
  max-width: 900px;
  margin: 0 auto;
  padding: 32px 24px 16px;
}

.Conteudo h3 {
  margin: 0 0 12px;
  color: #fff;
  font-family: 'Chakra Petch', sans-serif;
  font-size: 28px;
}

.Card-Upload-Arquivos {
  max-width: 900px;
  margin: 16px auto;
  padding: 24px;
  border: 1px solid #b829f7;
  border-radius: 16px;
  background: #0a0a0f;
  color: #fff;
  font-family: sans-serif;
}

.Card-Upload-Arquivos-Titulo {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.Card-Upload-Arquivos-Titulo h2 {
  margin: 0;
  font-size: 15px;
}

.Card-Enviar-Arquivos {
  display: block;
  padding: 56px 24px;
  border: 2px dashed #b829f7;
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
}

.desabilitado {
  opacity: 0.6;
  cursor: wait;
}

.Card-Enviar-Arquivos-Titulo {
  margin: 8px 0 4px;
  font-size: 16px;
  font-weight: bold;
}

.Card-Enviar-Arquivos-Subtitulo {
  margin-top: 4px;
  color: #9ca3af;
  font-size: 13px;
}

.Card-Enviar-Arquivos-Icone {
  display: block;
  margin: 0 auto 18px;
}

.mensagem-envio {
  margin-top: 12px;
  color: #d8b4fe;
  font-size: 13px;
}

.mensagem-erro {
  margin-top: 12px;
  padding: 10px 14px;
  border: 1px solid rgba(248, 113, 113, 0.4);
  border-radius: 8px;
  background: rgba(248, 113, 113, 0.1);
  color: #f87171;
  font-size: 13px;
}

.mensagem-sucesso {
  margin-top: 12px;
  padding: 10px 14px;
  border: 1px solid rgba(74, 222, 128, 0.4);
  border-radius: 8px;
  background: rgba(74, 222, 128, 0.1);
  color: #4ade80;
  font-size: 13px;
}

hr {
  margin: 20px 0;
  border: none;
  border-top: 1px solid #2a2a35;
}

.recent-files {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  cursor: pointer;
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
  margin-top: 16px;
  border-collapse: collapse;
  font-size: 13px;
}

.tabela-arquivos th {
  padding: 8px 12px;
  border-bottom: 1px solid #2a2a35;
  color: #9ca3af;
  font-weight: 500;
  text-align: left;
}

.tabela-arquivos td {
  padding: 12px;
  border-bottom: 1px solid #1a1a22;
  color: #fff;
}

.mono {
  font-family: 'Courier New', monospace;
}

.lista-vazia {
  margin-top: 16px;
  color: #9ca3af;
  font-size: 13px;
}
</style>
