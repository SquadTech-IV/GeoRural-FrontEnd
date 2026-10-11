<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="regras-overlay">
    <section
      class="regras-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-modal-salvar"
    >
      <RouterLink
        :to="{ name: 'Regras' }"
        class="regras-modal-fechar"
        aria-label="Fechar"
      >
        ×
      </RouterLink>

      <h2 id="titulo-modal-salvar">
        Criar nova versão
      </h2>

      <p class="regras-texto-secundario">
        Informe a vigência e o motivo da alteração.
        Os valores anteriores serão preservados no histórico.
      </p>

      <div class="regras-campo">
        <label for="inicio-vigencia">
          Início da vigência
        </label>

        <input
          id="inicio-vigencia"
          name="inicioVigencia"
          type="date"
          required
        />
      </div>

      <div class="regras-campo">
        <label for="motivo-alteracao">
          Motivo da alteração
        </label>

        <textarea
          id="motivo-alteracao"
          name="motivo"
          rows="3"
          required
          placeholder="Informe o motivo da alteração."
        ></textarea>
      </div>

      <div class="regras-acoes">
        <RouterLink
          :to="{ name: 'Regras' }"
          class="regras-botao"
        >
          Cancelar
        </RouterLink>

        <button
          type="button"
          class="regras-botao regras-botao--principal"
          disabled
        >
          Confirmar nova versão
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped src="../assets/css/regras.css"></style>
