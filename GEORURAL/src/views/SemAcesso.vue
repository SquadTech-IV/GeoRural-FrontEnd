<script setup>
import { RouterLink } from 'vue-router'
import BarraNavegacao from '../components/BarraNavegacao.vue'
</script>

<template>
  <BarraNavegacao />
  <main class="pagina" role="main">
    <h1>Acesso não permitido</h1>
    <p>Seu perfil não possui permissão para acessar esta página.</p>
    <RouterLink :to="{ name: 'Imoveis' }">Voltar para imóveis</RouterLink>
  </main>
</template>

<style scoped>
.pagina {
  padding: 40px 24px;
  color: var(--cor-texto);
}
h1 {
  font-family: var(--fonte-titulo);
}
p {
  margin: 16px 0 24px;
}
a {
  color: var(--cor-roxo);
}
</style>
