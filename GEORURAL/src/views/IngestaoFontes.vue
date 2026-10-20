<script setup>
import { ref } from 'vue'
import BarraNavegacao from '../components/BarraNavegacao.vue'
import IconDocumentation from '../components/icons/IconDocumentation.vue'
import IconUpload from '../components/icons/IconUpload.vue'



const mostrarArquivos = ref(false)
const arquivos = ref([])
const mensagemErro = ref('')

const EXTENSOES_ACEITAS = ['.zip', '.gpkg', '.geojson']

function obterExtensao(nomeArquivo) {
  const partes = nomeArquivo.toLowerCase().split('.')
  return '.' + partes[partes.length - 1]
}

function handleArquivoSelecionado(event) {
  registrarArquivos(event.target.files)
  event.target.value = ''
}

function handleArquivoSolto(event) {
  registrarArquivos(event.dataTransfer?.files ?? [])
}

function registrarArquivos(arquivosDoInput) {
  if (!arquivosDoInput.length) return

  mensagemErro.value = ''

  const arquivosValidos = []
  const arquivosInvalidos = []

  Array.from(arquivosDoInput).forEach((arquivo) => {
    const extensao = obterExtensao(arquivo.name)
    if (EXTENSOES_ACEITAS.includes(extensao)) {
      arquivosValidos.push(arquivo)
    } else {
      arquivosInvalidos.push(arquivo.name)
    }
  })

  if (arquivosInvalidos.length) {
    mensagemErro.value = arquivosInvalidos.length === 1
      ? `O arquivo "${arquivosInvalidos[0]}" não é um formato aceito. Envie Shapefile (.zip), GeoPackage (.gpkg) ou GeoJSON.`
      : `Os arquivos ${arquivosInvalidos.map((n) => `"${n}"`).join(', ')} não são formatos aceitos. Envie Shapefile (.zip), GeoPackage (.gpkg) ou GeoJSON.`
  }

  if (!arquivosValidos.length) {
    return
  }

  const arquivosSelecionados = arquivosValidos.map((arquivo) => ({
    id: crypto.randomUUID(),
    arquivo,
    nome: arquivo.name,
    fonte: 'Upload manual',
    recebido: new Date().toLocaleString('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).replace(',', ''),
    tamanho: formatarTamanho(arquivo.size),
    situacao: 'PENDENTE',
  }))

  arquivos.value = [...arquivosSelecionados, ...arquivos.value].slice(0, 8)
  mostrarArquivos.value = true
}

function formatarTamanho(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}


</script>

<template>
  <BarraNavegacao />
  <div class="Conteudo">
    <h3>Enviar imóvel rural</h3>
    <p>Envie o arquivo do imóvel com as camadas necessárias (Reserva Legal e vegetação).
      O sistema calcula a área e o Índice de Reserva Legal (IRL) e mostra o resultado no mapa.</p>
  </div>

  <div class="Card-Upload-Arquivos">
    <div class="Card-Upload-Arquivos-Titulo">
      <IconDocumentation />
      <h2>Upload de Arquivos</h2>
    </div>

    <label class="Card-Enviar-Arquivos" @dragover.prevent @drop.prevent="handleArquivoSolto">
      <p class="Card-Enviar-Arquivos-Titulo">
        <IconUpload class="Card-Enviar-Arquivos-Icone" />
        Arraste o arquivo do imóvel aqui ou clique para selecionar
      </p>
      <p class="Card-Enviar-Arquivos-Subtitulo">
        Formatos aceitos: Shapefile (.zip), GeoPackage (.gpkg) ou GeoJSON
      </p>
      <input type="file" accept=".zip,.gpkg,.geojson" class="entrada-arquivo" multiple @change="handleArquivoSelecionado" />
    </label>
    <p v-if="mensagemErro" class="mensagem-erro" role="alert">{{ mensagemErro }}</p>

    <p role="status">Os arquivos selecionados ficam apenas nesta p?gina. O envio ao servidor ainda n?o est? dispon?vel.</p>

    <hr/>

    <button type="button" class="recent-files" :aria-expanded="mostrarArquivos" @click="mostrarArquivos = !mostrarArquivos">
      <span class="icon"></span>
      <span>Arquivos recentes</span>
      <span class="arrow" :class="{ 'arrow--open': mostrarArquivos }">›</span>
    </button>

    <table v-if="mostrarArquivos" class="tabela-arquivos">
      <thead>
        <tr>
          <th>Arquivo</th>
          <th>Recebido</th>
          <th>Tamanho</th>
          <th>Situação</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="arquivo in arquivos" :key="arquivo.id">
          <td class="mono">{{ arquivo.nome }}</td>
          <td class="mono">{{ arquivo.recebido }}</td>
          <td class="mono">{{ arquivo.tamanho }}</td>
          <td>
            <span class="badge" :class="`badge--${arquivo.situacao.toLowerCase()}`">
              {{ arquivo.situacao }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>


</template>


<style scoped>

* {
  box-sizing: border-box;
}




.Conteudo {
  padding: 32px 24px 16px;
  max-width: 900px;
}

.Conteudo h3 {
  font-size: 28px;
  color: var(--cor-texto);
  margin: 0 0 12px;
  font-family: 'Chakra Petch', sans-serif;
}

.Conteudo p {
  color: var(--cor-texto-secundario);
  font-size: 14px;
  line-height: 1.5;
  margin: 0 auto;
  overflow-wrap: anywhere;
  font-family: 'Chakra Petch', sans-serif;
}

.Card-Upload-Arquivos {
  background: var(--cor-painel);
  border: 1px solid var(--cor-roxo);
  border-radius: 16px;
  padding: 24px;
  color: var(--cor-texto);
  font-family: sans-serif;
  max-width: 900px;
  margin: 16px auto;
  align-items: center;
  justify-content: center;
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
  border: 2px dashed var(--cor-roxo);
  border-radius: 12px;
  padding: 56px 24px;
  text-align: center;
  cursor: pointer;
  display: block;
}

.Card-Enviar-Arquivos-Titulo {
  font-weight: bold;
  font-size: 16px;
  margin: 8px 0 4px;
  overflow-wrap: anywhere;
}

.Card-Enviar-Arquivos-Subtitulo {
  color: var(--cor-texto-secundario);
  font-size: 13px;
  margin-top: 4px;
}

.Card-Enviar-Arquivos-Icone {
  display: block;
  margin: 0 auto 18px;
}

.mensagem-erro {
  color: var(--cor-erro);
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid rgba(248, 113, 113, 0.4);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  margin-top: 12px;
}

hr {
  border: none;
  border-top: 1px solid var(--cor-borda);
  margin: 20px 0;
}

.recent-files {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
}

.recent-files .arrow {
  margin-left: auto;
  color: var(--cor-roxo);
}

.arrow {
  margin-left: auto;
  color: var(--cor-roxo);
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

.tabela-arquivos thead th {
  text-align: left;
  color: var(--cor-texto-secundario);
  font-weight: 500;
  padding: 8px 12px;
  border-bottom: 1px solid var(--cor-borda);
}

.tabela-arquivos tbody td {
  padding: 12px;
  border-bottom: 1px solid var(--cor-borda-suave);
  color: var(--cor-texto);
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
  border: 1px solid rgba(74, 222, 128, 0.4);
}

.badge--rejeitado {
  color: var(--cor-erro);
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid rgba(248, 113, 113, 0.4);
}

.badge--pendente {
  color: var(--cor-aviso);
  background: rgba(250, 204, 21, 0.1);
  border: 1px solid rgba(250, 204, 21, 0.4);
}

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.Conteudo, .Card-Upload-Arquivos { width: calc(100% - 32px); margin: 16px auto; }
.Card-Enviar-Arquivos { position: relative; }
.entrada-arquivo { position: absolute; width: 1px; height: 1px; opacity: 0; }
.Card-Enviar-Arquivos:focus-within, .recent-files:focus-visible { outline: 2px solid var(--cor-roxo); outline-offset: 4px; }
.recent-files { width: 100%; border: 0; padding: 8px 0; background: transparent; color: inherit; text-align: left; }
.tabela-arquivos { table-layout: fixed; }
.tabela-arquivos td, .tabela-arquivos th { overflow-wrap: anywhere; }
@media (max-width: 640px) { .Card-Upload-Arquivos { padding: 12px; } .Card-Enviar-Arquivos { padding: 24px 12px; } .tabela-arquivos tbody td, .tabela-arquivos thead th { padding: 8px 4px; } }

</style>
