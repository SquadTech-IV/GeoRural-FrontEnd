<script setup>
import { ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()

const tema = ref(
  document.documentElement.dataset.tema || 'light',
)

const itens = [
  {
    caminho: '/zona-tratada',
    titulo: 'Zona tratada',
    icone: 'arquivos',
  },
  {
    caminho: '/arquivos-recebidos',
    titulo: 'Arquivos recebidos',
    icone: 'arquivos',
  },
  {
    caminho: '/cadastros',
    titulo: 'Cadastros',
    icone: 'upload',
  },
  {
    caminho: '/',
<<<<<<< HEAD
    titulo: 'Ingestão de fontes',
    icone: 'upload',
=======
    titulo: 'Regras',
    icone: 'regras',
  },
  {
    caminho: '/ingestao',
    titulo: 'Ingestão de fontes',
    icone: 'upload',
  },
  {
    caminho: '/processar',
    titulo: 'Processar dados',
    icone: 'processar',
  },
  {
    caminho: '/imoveis',
    titulo: 'Imóveis',
    icone: 'mapa',
  },
  {
    caminho: '/qualidade',
    titulo: 'Conferência dos resultados',
    icone: 'qualidade',
  },
  {
    caminho: '/auditoria',
    titulo: 'Linhagem e auditoria',
    icone: 'auditoria',
  },
  {
    caminho: '/rastreabilidade',
    titulo: 'Trajetória no datalake',
    icone: 'rastreabilidade',
>>>>>>> cba4571be93906c02346280169a1428756bbb4f0
  },
  {
    caminho: '/processar',
    titulo: 'Processar dados',
    icone: 'processar',
  },
  {
    caminho: '/arquivos-recebidos',
    titulo: 'Arquivos recebidos',
    icone: 'arquivos',
  },
  {
    caminho: '/quarentena',
    titulo: 'Quarentena',
    icone: 'quarentena',
  },
  {
    caminho: '/qualidade',
    titulo: 'Conferência dos resultados',
    icone: 'qualidade',
  },
  {
    caminho: '/auditoria',
    titulo: 'Linhagem e auditoria',
    icone: 'auditoria',
  },
]

function estaAtivo(caminho) {
  if (caminho === '/') {
<<<<<<< HEAD
=======
    return (
      route.path === '/' ||
      [
        'RegraNovaVersao',
        'RegraDetalheVersao',
        'RegraCompararVersoes',
      ].includes(route.name)
    )
  }

  if (caminho === '/imoveis') {
>>>>>>> cba4571be93906c02346280169a1428756bbb4f0
    return (
      route.path === '/' ||
      route.path === '/ingestao'
    )
  }

  return (
    route.path === caminho ||
    route.path.startsWith(`${caminho}/`)
  )
}

function alternarTema() {
  tema.value =
    tema.value === 'light' ? 'dark' : 'light'

  document.documentElement.dataset.tema = tema.value

  try {
    localStorage.setItem(
      'georural-tema',
      tema.value,
    )
  } catch {
    // Mantém a troca de tema mesmo sem acesso ao armazenamento.
  }
}
</script>

<template>
  <aside
    class="sidebar"
    aria-label="Menu principal"
  >
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

        <span class="sidebar-nome">
          GEORURAL
        </span>
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
            'sidebar-link--ativo':
              estaAtivo(item.caminho),
          }"
          :aria-current="
            estaAtivo(item.caminho)
              ? 'page'
              : undefined
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

            <template
<<<<<<< HEAD
              v-else-if="item.icone === 'processar'"
            >
              <path
                d="M20 7h-9M5 7H4M20 17h-1M13 17H4"
              />
              <circle cx="8" cy="7" r="3" />
              <circle cx="16" cy="17" r="3" />
            </template>

            <template
              v-else-if="item.icone === 'arquivos'"
=======
              v-else-if="item.icone === 'regras'"
>>>>>>> cba4571be93906c02346280169a1428756bbb4f0
            >
              <path
                d="M4 7h2M12 7h8M4 17h8M18 17h2"
              />
<<<<<<< HEAD
              <path d="M14 3v6h6" />
              <path d="M8 13h8M8 17h6" />
            </template>

            <template
              v-else-if="item.icone === 'quarentena'"
            >
              <path
                d="M10.3 4.9 2.5 18.4A1.7 1.7 0 0 0 4 21h16a1.7 1.7 0 0 0 1.5-2.6L13.7 4.9a2 2 0 0 0-3.4 0Z"
              />
              <path d="M12 9v5M12 17h.01" />
            </template>

            <template
              v-else-if="item.icone === 'qualidade'"
            >
=======
              <circle cx="9" cy="7" r="3" />
              <circle cx="15" cy="17" r="3" />
            </template>

            <template
              v-else-if="item.icone === 'processar'"
            >
              <path d="m9 5 11 7-11 7z" />
              <path d="M4 5v14" />
            </template>

            <template
              v-else-if="item.icone === 'qualidade'"
            >
              <path
                d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"
              />
              <path d="m8 12 3 3 5-6" />
            </template>

            <template
              v-else-if="item.icone === 'auditoria'"
            >
              <circle cx="6" cy="5" r="2" />
              <circle cx="6" cy="19" r="2" />
              <circle cx="18" cy="12" r="2" />
              <path
                d="M6 7v10M8 5h3a7 7 0 0 1 7 5"
              />
              <path
                d="M8 19h3a7 7 0 0 0 7-5"
              />
            </template>

            <template
              v-else-if="item.icone === 'rastreabilidade'"
            >
              <circle cx="5" cy="5" r="2" />
              <circle cx="19" cy="19" r="2" />
              <path
                d="M7 5h8a4 4 0 0 1 0 8H9a4 4 0 0 0 0 8h8"
              />
            </template>

            <template
              v-else-if="item.icone === 'arquivos'"
            >
              <path
                d="M14 3H6v18h12V9zM14 3v6h4M8 13h8M8 17h5"
              />
            </template>

            <template v-else>
>>>>>>> cba4571be93906c02346280169a1428756bbb4f0
              <path
                d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"
              />
              <path d="m8 12 3 3 5-6" />
            </template>

            <template
              v-else-if="item.icone === 'auditoria'"
            >
              <circle cx="6" cy="5" r="2" />
              <circle cx="6" cy="19" r="2" />
              <circle cx="18" cy="12" r="2" />
              <path
                d="M6 7v10M8 5h3a7 7 0 0 1 7 5"
              />
              <path
                d="M8 19h3a7 7 0 0 0 7-5"
              />
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
              <circle
                cx="12"
                cy="12"
                r="4"
              />

              <path
                d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"
              />
            </template>
          </svg>
        </span>

        <span class="sidebar-tema-texto">
          {{
            tema === 'light'
              ? 'Modo escuro'
              : 'Modo claro'
          }}
        </span>
      </button>
    </footer>
  </aside>
</template>

<style scoped src="../assets/css/navegacao.css"></style>
