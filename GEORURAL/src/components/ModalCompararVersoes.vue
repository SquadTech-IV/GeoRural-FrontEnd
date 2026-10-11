<script setup>
import { RouterLink } from 'vue-router'
</script>
<template>
  <div class="regras-overlay">
    <section class="regras-modal" role="dialog" aria-modal="true" aria-labelledby="titulo-modal-comparacao">
      <RouterLink :to="{ name: 'Regras' }" class="regras-modal-fechar" aria-label="Fechar">
        ×
      </RouterLink>

      <h2 id="titulo-modal-comparacao">
        Comparar versões
      </h2>

      <p class="regras-texto-secundario">
        Selecione duas versões para comparar os parâmetros.
      </p>

      <div class="regras-comparacao-seletores">
        <label for="comparacao-primeira">
          Primeira versão

          <select id="comparacao-primeira" name="primeiraVersao" disabled>
            <option value="" selected>
              Nenhuma versão carregada
            </option>
          </select>
        </label>

        <label for="comparacao-segunda">
          Segunda versão

          <select id="comparacao-segunda" name="segundaVersao" disabled>
            <option value="" selected>
              Nenhuma versão carregada
            </option>
          </select>
        </label>
      </div>

      <div class="regras-tabela-container">
        <table class="regras-tabela">
          <thead>
            <tr>
              <th scope="col">Parâmetro</th>
              <th scope="col">Primeira versão</th>
              <th scope="col">Segunda versão</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td colspan="3">
                Nenhum dado disponível para comparação.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="regras-acoes">
        <RouterLink :to="{ name: 'Regras' }" class="regras-botao">
          Fechar
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped src="../assets/css/regras.css"></style>
