<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import BarraNavegacao from '../components/BarraNavegacao.vue'
import GraficoComposicao from '../components/GraficoComposicao.vue'
import GraficoDistribuicao from '../components/GraficoDistribuicao.vue'
import { criarControleConsultaIndicadores } from '../services/consultaIndicadoresControleService'
defineOptions({ name: 'ConsultaIndicadores' })
const router = useRouter()
const controle = criarControleConsultaIndicadores()
const {
  indicador,
  versao,
  municipio,
  busca,
  catalogo,
  itens,
  series,
  paginaAtual,
  totalResultados,
  totalPaginas,
  carregando,
  carregandoOpcoes,
  erro,
  erroGraficos,
  erroOpcoes,
  metaAtual,
  opcoesVersoes,
  imovelSelecionado,
  carregarOpcoesFiltros,
  buscarIndicadores,
  aplicarFiltros,
  trocarIndicador,
  abrirModal,
  fecharModal,
} = controle
const fmt = (v) => Number(v ?? 0).toLocaleString('pt-BR')
async function irParaMapaImovel(item) {
  fecharModal()
  await router.push(item.mapa)
}
onMounted(carregarOpcoesFiltros)
onBeforeUnmount(controle.destruir)
</script>

<template>
  <div class="pg-layout">
    <BarraNavegacao />

    <main class="pg-pagina">
      <header class="pg-cabecalho">
        <h1>Indicadores</h1>
        <p>
          Os resultados por imóvel, com filtro de município, imóvel, indicador e versão. Os gráficos
          mostram a mesma consulta que está na tabela.
        </p>
      </header>

      <section class="pg-filtros" aria-label="Filtros dos indicadores">
        <label class="pg-campo">
          <span>Indicador</span>
          <select
            v-model="indicador"
            :disabled="carregandoOpcoes || !catalogo.length"
            @change="trocarIndicador"
          >
            <option v-for="opcao in catalogo" :key="opcao.sigla" :value="opcao.sigla">
              {{ opcao.rotulo }}
            </option>
          </select>
        </label>

        <label class="pg-campo">
          <span>Versão</span>
          <select v-model="versao" :disabled="carregandoOpcoes || !!erroOpcoes">
            <option value="">Vigente</option>
            <option v-for="v in opcoesVersoes" :key="v.id" :value="v.id">
              {{ v.rotulo }}
            </option>
          </select>
        </label>

        <label class="pg-campo">
          <span>Município</span>
          <input
            v-model="municipio"
            type="search"
            placeholder="Nome ou parte do município"
            @keyup.enter="aplicarFiltros"
          />
        </label>

        <label class="pg-campo pg-campo--largo">
          <span>Código CAR do imóvel</span>
          <input
            v-model="busca"
            type="search"
            placeholder="Código CAR ou parte dele"
            @keyup.enter="aplicarFiltros"
          />
        </label>

        <button
          type="button"
          class="pg-botao"
          :disabled="carregando || carregandoOpcoes || !indicador"
          @click="aplicarFiltros"
        >
          {{ carregando ? 'Buscando...' : 'Aplicar' }}
        </button>
      </section>

      <p v-if="erroOpcoes" class="pg-bloco" role="alert">
        Versões: {{ erroOpcoes }}
        <button type="button" class="pg-botao" @click="carregarOpcoesFiltros">
          Tentar novamente
        </button>
      </p>
      <p v-if="erro" class="pg-bloco" role="alert">
        {{ erro }}
        <button type="button" class="pg-botao" @click="carregarOpcoesFiltros">
          Tentar novamente
        </button>
      </p>
      <p v-if="erroGraficos" class="pg-bloco" role="alert">Gráficos: {{ erroGraficos }}</p>
      <p v-if="!carregandoOpcoes && !erro && !catalogo.length" class="pg-bloco">
        Nenhum indicador disponível no catálogo.
      </p>
      <div v-if="series && !carregando" class="graf-dupla">
        <GraficoComposicao
          :total="series.resultados"
          :imoveis="series.imoveis"
          :series="series.composicao"
        />

        <GraficoDistribuicao
          :titulo="series.titulo"
          :faixas="series.faixas"
          :valores="series.valores"
        />
      </div>
      <ul v-if="series?.avisos.length" class="pg-ajuda">
        <li v-for="aviso in series.avisos" :key="aviso">{{ aviso }}</li>
      </ul>

      <section class="pg-bloco">
        <div class="pg-bloco-topo">
          <h2>Resultados por imóvel</h2>
          <span> {{ fmt(itens.length) }} de {{ fmt(totalResultados) }} resultados </span>
        </div>

        <div class="pg-rolagem">
          <table class="pg-tabela">
            <thead>
              <tr>
                <th>Imóvel</th>
                <th>Município</th>
                <th>Indicador</th>
                <th class="num">Valor</th>
                <th>Situação</th>
                <th>Versão</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="carregando || carregandoOpcoes">
                <td colspan="6" class="pg-vazio">Carregando resultados...</td>
              </tr>
              <template v-else-if="itens.length">
                <tr
                  v-for="item in itens"
                  :key="item.id"
                  tabindex="0"
                  role="button"
                  @click="abrirModal(item)"
                  @keydown.enter="abrirModal(item)"
                  @keydown.space.prevent="abrirModal(item)"
                >
                  <td>
                    <strong>{{ item.rotulo }}</strong>
                    <small class="pg-mono">{{ item.car }}</small>
                  </td>
                  <td>{{ item.municipio }}</td>
                  <td>{{ item.indicador }}</td>
                  <td class="num">{{ item.valorTexto }}</td>
                  <td>
                    <span class="pg-selo" :class="`pg-selo--${item.situacaoApresentada.classe}`">
                      {{ item.situacaoApresentada.texto }}
                    </span>
                  </td>
                  <td>#{{ item.versao }}</td>
                </tr>
              </template>
              <tr v-else-if="!erro">
                <td colspan="6" class="pg-vazio">Nenhum imóvel neste filtro.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer class="pg-rodape">
          <span>
            Página {{ totalPaginas ? paginaAtual : 0 }} de {{ totalPaginas }} — mostrando
            {{ fmt(itens.length) }} resultados
          </span>
          <span>
            <button
              type="button"
              class="pg-botao"
              :disabled="paginaAtual <= 1 || carregando"
              @click="buscarIndicadores(paginaAtual - 1)"
            >
              Anteriores
            </button>
            <button
              type="button"
              class="pg-botao"
              :disabled="paginaAtual >= totalPaginas || carregando"
              @click="buscarIndicadores(paginaAtual + 1)"
            >
              Próximos
            </button>
          </span>
        </footer>
      </section>
    </main>

    <div
      v-if="imovelSelecionado"
      class="pg-modal"
      role="dialog"
      aria-modal="true"
      @click.self="fecharModal"
    >
      <div class="pg-modal-caixa" style="width: min(36rem, 100%)">
        <header>
          <div>
            <h2>{{ imovelSelecionado.rotulo }}</h2>
            <p class="pg-mono">{{ imovelSelecionado.car }}</p>
          </div>
          <button type="button" class="pg-botao" @click="fecharModal">Fechar</button>
        </header>

        <table class="pg-tabela">
          <tbody>
            <tr>
              <td>Município</td>
              <td class="num">
                <strong>{{ imovelSelecionado.municipio }}</strong>
              </td>
            </tr>
            <tr>
              <td>{{ metaAtual.rotulo }}</td>
              <td class="num">
                <strong>{{ imovelSelecionado.valorTexto }}</strong>
              </td>
            </tr>
            <tr>
              <td>Situação</td>
              <td class="num">
                <span
                  class="pg-selo"
                  :class="`pg-selo--${imovelSelecionado.situacaoApresentada.classe}`"
                >
                  {{ imovelSelecionado.situacaoApresentada.texto }}
                </span>
              </td>
            </tr>
            <tr>
              <td>Versão</td>
              <td class="num">#{{ imovelSelecionado.versao }}</td>
            </tr>
            <tr>
              <td>Regra aplicada</td>
              <td class="num">{{ imovelSelecionado.regraVersao || 'Não informada' }}</td>
            </tr>
            <tr>
              <td>Área informada</td>
              <td class="num">{{ imovelSelecionado.hectaresTexto }}</td>
            </tr>
          </tbody>
        </table>

        <div class="pg-modal-rodape">
          <span class="pg-ajuda" style="margin: 0">Resumo do imóvel.</span>
          <button
            type="button"
            class="pg-botao pg-botao--principal"
            @click="irParaMapaImovel(imovelSelecionado)"
          >
            Ver completo no mapa do imóvel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '../assets/css/resultados-indicadores.css';
</style>
