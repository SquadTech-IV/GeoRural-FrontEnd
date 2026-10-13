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
          new Date(b.recebidoEm) - new Date(a.recebidoEm),
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
    EXTENSOES_ACEITAS.includes(obterExtensao(arquivo.name)),
  )

  const invalidos = selecionados.filter(
    (arquivo) =>
      !EXTENSOES_ACEITAS.includes(obterExtensao(arquivo.name)),
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
      (resultado) => resultado.aceito,
    )

    const rejeitados = resultados.filter(
      (resultado) => !resultado.aceito,
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

  <div class="tela-upload">
    <div class="Conteudo">
      <h3>Upload de Arquivos</h3>
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

      <p
        v-if="mensagemErro"
        class="mensagem-erro"
        role="alert"
      >
        {{ mensagemErro }}
      </p>

      <p
        v-if="mensagemSucesso"
        class="mensagem-sucesso"
        role="status"
      >
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
        <table
          v-if="arquivos.length"
          class="tabela-arquivos"
        >
          <thead>
            <tr>
              <th>Arquivo</th>
              <th>Recebido em</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="arquivo in arquivos"
              :key="arquivo.id"
            >
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
  </div>
</template>

<style scoped src="../assets/css/upload.css"></style>
