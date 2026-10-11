<script setup>
import { RouterLink, RouterView } from 'vue-router'
import BarraNavegacao from '../components/BarraNavegacao.vue'
</script>

<template>
  <BarraNavegacao />

  <main class="regras-pagina">
    <header class="regras-cabecalho">
      <h1>Regras e Métodos</h1>

      <p>
        Consulte os métodos de cálculo, configure os parâmetros
        e acompanhe o histórico de versões.
      </p>
    </header>

    <div class="regras-layout">
      <aside class="regras-lista" aria-label="Indicadores">
        <section>
          <div class="regras-grupo">
            <h2>Com valores a configurar</h2>
            <p>Parâmetros utilizados pelos indicadores.</p>
          </div>

          <p class="regras-lista-vazia">
            Nenhum indicador carregado.
          </p>
        </section>

        <section>
          <div class="regras-grupo">
            <h2>Sem valores a configurar</h2>
            <p>Métodos de cálculo para consulta.</p>
          </div>

          <p class="regras-lista-vazia">
            Nenhum indicador carregado.
          </p>
        </section>
      </aside>

      <section class="regras-detalhe">
        <header class="regras-detalhe-cabecalho">
          <div>
            <h2>Detalhes do indicador</h2>

            <p>
              Selecione um indicador para consultar suas informações.
            </p>

            <small>Versão vigente: —</small>
          </div>
        </header>

        <details>
          <summary class="regras-formula-botao">
            Como é calculado
          </summary>

          <div class="regras-formula">
            Nenhum método de cálculo carregado.
          </div>
        </details>

        <section class="regras-parametros-vazios">
          <h3 class="regras-secao-titulo">
            Parâmetros
          </h3>

          <p class="regras-texto-secundario">
            Nenhum parâmetro carregado.
          </p>
        </section>

        <div class="regras-acoes">
          <RouterLink
            :to="{ name: 'RegraNovaVersao' }"
            class="regras-botao regras-botao--principal"
          >
            Nova versão
          </RouterLink>
        </div>

        <section class="regras-historico">
          <div class="regras-historico-cabecalho">
            <h3 class="regras-secao-titulo">
              Histórico de versões
            </h3>

            <RouterLink
              :to="{ name: 'RegraCompararVersoes' }"
              class="regras-botao"
            >
              Comparar versões
            </RouterLink>
          </div>

          <p class="regras-texto-secundario">
            Nenhuma versão carregada.
          </p>

          <RouterLink
            :to="{ name: 'RegraDetalheVersao' }"
            class="regras-botao"
          >
            Detalhes da versão
          </RouterLink>
        </section>
      </section>
    </div>
  </main>

  <RouterView />
</template>

<style scoped src="../assets/css/regras.css"></style>
