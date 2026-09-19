<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useRouter } from 'vue-router'
import ModalProcessamento from '../components/ModalProcessamento.vue'
import IconDocumentation from '../components/icons/IconDocumentation.vue'
import IconUpload from '../components/icons/IconUpload.vue'

const router = useRouter()
const mostrarModal = ref(false)
const mostrarArquivos = ref(false)
const arquivos = ref([])

function handleArquivoSelecionado(event) {
  const arquivosDoInput = event.target.files
  if (!arquivosDoInput.length) return

  const arquivosSelecionados = Array.from(arquivosDoInput).map((arquivo) => ({
    nome: arquivo.name,
    recebido: new Date().toLocaleString('pt-BR', {
    }).replace(',', ''),
    tamanho: formatarTamanho(arquivo.size),
    situacao: 'PENDENTE',
  }))

  arquivos.value = [...arquivosSelecionados, ...arquivos.value].slice(0, 8)
  mostrarModal.value = true
}

function formatarTamanho(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function handleProcessamentoFinalizado() {
  mostrarModal.value = false
  router.push({ name: 'Resultado' })
}
</script>

<template>
  <div class="Topo">
    <div class="Nome-Projeto">
      <img src="@/assets/LogoSquadTech.png" alt="Logo Squad Tech" />
      <h1>GEORURAL</h1>
    </div>

    <nav class="Barra-Navegacao">
      <RouterLink to="/" class="Barra-Navegacao-item" active-class="Barra-Navegacao-item--ativo">
        Ingestão de Fontes
      </RouterLink>
    </nav>
  </div>

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

    <label class="Card-Enviar-Arquivos">
      <p class="Card-Enviar-Arquivos-Titulo">
        <IconUpload class="Card-Enviar-Arquivos-Icone" />
        Arraste o arquivo do imóvel aqui ou clique para selecionar
      </p>
      <p class="Card-Enviar-Arquivos-Subtitulo">
        Formatos aceitos: Shapefile (.zip), GeoPackage (.gpkg) ou GeoJSON
      </p>
      <input type="file" accept=".zip,.gpkg,.geojson" hidden multiple @change="handleArquivoSelecionado" />
    </label>

    <hr/>

    <div class="recent-files" @click="mostrarArquivos = !mostrarArquivos">
      <span class="icon"></span>
      <span>Arquivos recentes</span>
      <span class="arrow" :class="{ 'arrow--open': mostrarArquivos }">›</span>
    </div>

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
        <tr v-for="arquivo in arquivos" :key="arquivo.nome">
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

  <div v-if="mostrarModal" class="overlay">
    <ModalProcessamento @finalizado="handleProcessamentoFinalizado" />
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

:global(body) {
  background: #000000;
  align-items: center;
  justify-content: center;
  margin: 0;
}

.Topo {
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 16px 24px;
  background: #000000;
  border-bottom: 1px solid #1a1a22;
  margin: 0 auto;
}

.Nome-Projeto {
  display: flex;
  align-items: center;
  gap: 8px;
}

.Nome-Projeto h1 {
  font-size: 16px;
  letter-spacing: 1px;
  margin: 0;
  color: #fff;
  font-family: 'Chakra Petch', sans-serif;
}

.Nome-Projeto img {
  height: 40px;
  width: auto;
}

.Barra-Navegacao {
  display: flex;
  align-items: center;
  gap: 20px;
  align-self: stretch;
}

.Barra-Navegacao-item {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 4px;
  font-size: 16px;
  font-weight: 500;
  color: #9ca3af;
  text-decoration: none;
  border-bottom: 2px solid transparent;
}

.Barra-Navegacao-item--ativo {
  color: #fff;
  border-bottom-color: #b829f7;
}

.Conteudo {
  padding: 32px 24px 16px;
  max-width: 900px;
}

.Conteudo h3 {
  font-size: 28px;
  color: #fff;
  margin: 0 0 12px;
  font-family: 'Chakra Petch', sans-serif;
}

.Conteudo p {
  color: #9ca3af;
  font-size: 16px;
  line-height: 1.5;
  margin: 0 auto;
  white-space: nowrap;
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
  border: 2px dashed #b829f7;
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
  white-space: nowrap;
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

.recent-files .arrow {
  margin-left: auto;
  color: #b829f7;
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

.tabela-arquivos thead th {
  text-align: left;
  color: #9ca3af;
  font-weight: 500;
  padding: 8px 12px;
  border-bottom: 1px solid #2a2a35;
}

.tabela-arquivos tbody td {
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
  border: 1px solid rgba(74, 222, 128, 0.4);
}

.badge--rejeitado {
  color: #f87171;
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid rgba(248, 113, 113, 0.4);
}

.badge--pendente {
  color: #facc15;
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
</style>
