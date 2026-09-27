<script setup>
import { RouterLink } from 'vue-router'
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
      <RouterLink to="/verificar-dados-existentes" class="Barra-Navegacao-item" active-class="Barra-Navegacao-item--ativo">
        Verificar Dados Existentes
      </RouterLink>
    </nav>
  </div>
</template>

<style scoped>
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
  font-size: 14px;
  font-weight: 500;
  color: #9ca3af;
  text-decoration: none;
  border-bottom: 2px solid transparent;
  font-family: 'Chakra Petch', sans-serif;
}

.Barra-Navegacao-item--ativo {
  color: #fff;
  border-bottom-color: #b829f7;
}
</style>
