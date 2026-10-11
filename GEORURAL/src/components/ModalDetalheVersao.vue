<script setup>
import { RouterLink } from 'vue-router'
</script>
<template>
  <div class="regras-overlay">
    <section class="regras-modal" role="dialog" aria-modal="true" aria-labelledby="titulo-modal-versao">
      <RouterLink :to="{ name: 'Regras' }" class="regras-modal-fechar" aria-label="Fechar">
        ×
      </RouterLink>

      <h2 id="titulo-modal-versao">
        Detalhes da versão
      </h2>

      <dl class="regras-metadados">
        <div>
          <dt>Indicador</dt>
          <dd>—</dd>
        </div>

        <div>
          <dt>Versão</dt>
          <dd>—</dd>
        </div>

        <div>
          <dt>Criada em</dt>
          <dd>—</dd>
        </div>

        <div>
          <dt>Autor</dt>
          <dd>—</dd>
        </div>

        <div>
          <dt>Início da vigência</dt>
          <dd>—</dd>
        </div>

        <div>
          <dt>Fim da vigência</dt>
          <dd>—</dd>
        </div>

        <div>
          <dt>Resultados vinculados</dt>
          <dd>—</dd>
        </div>
      </dl>

      <h3 class="regras-secao-titulo">
        Parâmetros
      </h3>

      <p class="regras-texto-secundario">
        Nenhuma versão carregada.
      </p>

      <h3 class="regras-secao-titulo">
        Motivo da alteração
      </h3>

      <p class="regras-texto-secundario">
        —
      </p>

      <div class="regras-acoes">
        <button type="button" class="regras-botao">
          Fechar
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped src="../assets/css/regras.css"></style>
