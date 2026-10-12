<script setup>
import { ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()

const tema = ref(
  document.documentElement.dataset.tema || 'light',
)

const itens = [
  {
    caminho: '/',
    titulo: 'Ingestão de Fontes',
    icone: 'upload',
  },
  {
    caminho: '/verificar-dados-existentes',
    titulo: 'Dados Existentes',
    icone: 'arquivos',
  },
  {
    caminho: '/imoveis',
    titulo: 'Imóveis',
    icone: 'mapa',
  },
  {
    caminho: '/regras',
    titulo: 'Regras e Métodos',
    icone: 'regras',
  },
  {
    caminho: '/cadastros',
    titulo: 'Fontes e conjuntos',
    icone: 'cadastros',
  },
]

function estaAtivo(caminho) {
  if (caminho === '/') {
    return route.path === '/'
  }

  if (
    caminho === '/imoveis' &&
    route.path.startsWith('/resultado/')
  ) {
    return true
  }

  return (
    route.path === caminho ||
    route.path.startsWith(`${caminho}/`)
  )
}

function alternarTema() {
  tema.value = tema.value === 'light' ? 'dark' : 'light'

  document.documentElement.dataset.tema = tema.value

  try {
    localStorage.setItem('georural-tema', tema.value)
  } catch {
    // A troca de tema funciona mesmo sem acesso ao armazenamento.
  }
}
</script>

<template>
  <aside class="sidebar" aria-label="Menu principal">
    <div class="sidebar-cabecalho">
      <RouterLink
        to="/"
        class="sidebar-marca"
        aria-label="GeoRural — página inicial"
      >
        <img
          src="@/assets/LogoSquadTech.png"
          alt=""
          class="sidebar-logo"
        />

        <span class="sidebar-nome">GEORURAL</span>
      </RouterLink>
    </div>

    <div class="sidebar-conteudo">
      <nav
        class="sidebar-links"
        aria-label="Navegação principal"
      >
        <RouterLink
          v-for="item in itens"
          :key="item.caminho"
          :to="item.caminho"
          class="sidebar-link"
          :class="{
            'sidebar-link--ativo': estaAtivo(item.caminho),
          }"
          :aria-current="
            estaAtivo(item.caminho) ? 'page' : undefined
          "
        >
          <svg
            class="sidebar-icone"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <template v-if="item.icone === 'upload'">
              <path d="M12 16V4" />
              <path d="m7 9 5-5 5 5" />
              <path d="M4 16v4h16v-4" />
            </template>

            <template v-else-if="item.icone === 'arquivos'">
              <path
                d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"
              />
              <path d="M14 3v6h6" />
              <path d="M8 13h8M8 17h6" />
            </template>

            <template v-else-if="item.icone === 'regras'">
              <path d="M4 7h2M12 7h8M4 17h8M18 17h2" />
              <circle cx="9" cy="7" r="3" />
              <circle cx="15" cy="17" r="3" />
            </template>

            <template v-else-if="item.icone === 'cadastros'">
              <ellipse cx="12" cy="5" rx="8" ry="3" />
              <path
                d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5"
              />
              <path
                d="M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7"
              />
            </template>

            <template v-else>
              <path
                d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"
              />
              <path d="M9 3v15M15 6v15" />
            </template>
          </svg>

          <span>{{ item.titulo }}</span>
        </RouterLink>
      </nav>
    </div>

    <footer class="sidebar-rodape">
      <button
        type="button"
        class="sidebar-tema"
        :aria-label="
          tema === 'light'
            ? 'Ativar tema escuro'
            : 'Ativar tema claro'
        "
        :title="
          tema === 'light'
            ? 'Ativar tema escuro'
            : 'Ativar tema claro'
        "
        @click="alternarTema"
      >
        <span class="sidebar-tema-icone">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path
              v-if="tema === 'light'"
              d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"
            />

            <template v-else>
              <circle cx="12" cy="12" r="4" />
              <path
                d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"
              />
            </template>
          </svg>
        </span>

        <span class="sidebar-tema-texto">
          {{ tema === 'light' ? 'Modo escuro' : 'Modo claro' }}
        </span>
      </button>
    </footer>
  </aside>
</template>

<style scoped src="../assets/css/navegacao.css"></style>
