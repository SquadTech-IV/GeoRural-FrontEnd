<script setup>
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import logo from '@/assets/LogoSquadTech.png'
import { autenticacaoService } from '../services/autenticacaoService'
import {
  possuiPermissao,
  permissaoRota,
} from '../services/permissaoService'

const route = useRoute()
const router = useRouter()

const saindo = ref(false)
const erroSaida = ref('')
const tema = ref(document.documentElement.dataset.tema || 'dark')

const descricaoTema = computed(() =>
  tema.value === 'light'
    ? 'Ativar tema escuro'
    : 'Ativar tema claro',
)

const itens = [
  {
    caminho: '/operacao',
    titulo: 'Painel da operação',
    icone: 'painel',
  },
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
    caminho: '/regras',
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
    caminho: '/municipios',
    titulo: 'Municípios',
    icone: 'municipios',
  },
  {
    caminho: '/imoveis',
    titulo: 'Imóveis',
    icone: 'mapa',
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
  {
    caminho: '/rastreabilidade',
    titulo: 'Trajetória no datalake',
    icone: 'rastreabilidade',
  },
  {
    caminho: '/monitoramento',
    titulo: 'Saúde da plataforma',
    icone: 'monitoramento',
  },
]

const itensVisiveis = computed(() =>
  itens.filter((item) => {
    const rota = router.resolve(item.caminho)

    // Não exibe links sem uma rota nomeada correspondente.
    if (!rota.name) return false

    return possuiPermissao(
      autenticacaoService.estado.perfil,
      permissaoRota(rota.name),
    )
  }),
)

async function sair() {
  if (saindo.value) return

  saindo.value = true
  erroSaida.value = ''

  try {
    await autenticacaoService.sair()
    await router.replace({ name: 'Login' })
  } catch {
    erroSaida.value =
      'Não foi possível concluir a saída. Tente novamente.'
  } finally {
    saindo.value = false
  }
}

function estaAtivo(caminho) {
  if (caminho === '/regras') {
    return (
      route.path === '/regras' ||
      route.path.startsWith('/regras/') ||
      [
        'RegraNovaVersao',
        'RegraDetalheVersao',
        'RegraCompararVersoes',
      ].includes(route.name)
    )
  }

  if (caminho === '/imoveis') {
    return (
      route.path === '/imoveis' ||
      route.path.startsWith('/imoveis/') ||
      route.path.startsWith('/resultado/') ||
      route.path === '/mapa-indicadores' ||
      route.path.startsWith('/mapa-indicadores/')
    )
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
    // O tema continua funcionando sem persistência.
  }
}
</script>

<template>
  <aside
    v-if="route.name !== 'Login' && !route.meta.ocultarNavegacao"
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
          :src="logo"
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
          v-for="item in itensVisiveis"
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

            <template v-else-if="item.icone === 'regras'">
              <path d="M4 7h2M12 7h8M4 17h8M18 17h2" />
              <circle cx="9" cy="7" r="3" />
              <circle cx="15" cy="17" r="3" />
            </template>

            <template v-else-if="item.icone === 'processar'">
              <path d="m9 5 11 7-11 7z" />
              <path d="M4 5v14" />
            </template>

            <template v-else-if="item.icone === 'municipios'">
              <path d="M3 21h18" />
              <path d="M5 21V7l8-4v18" />
              <path d="M19 21V11l-6-4" />
              <path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01" />
            </template>

            <template v-else-if="item.icone === 'qualidade'">
              <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z" />
              <path d="m8 12 3 3 5-6" />
            </template>

            <template v-else-if="item.icone === 'auditoria'">
              <circle cx="6" cy="5" r="2" />
              <circle cx="6" cy="19" r="2" />
              <circle cx="18" cy="12" r="2" />
              <path d="M6 7v10M8 5h3a7 7 0 0 1 7 5" />
              <path d="M8 19h3a7 7 0 0 0 7-5" />
            </template>

            <template v-else-if="item.icone === 'rastreabilidade'">
              <circle cx="5" cy="5" r="2" />
              <circle cx="19" cy="19" r="2" />
              <path d="M7 5h8a4 4 0 0 1 0 8H9a4 4 0 0 0 0 8h8" />
            </template>

            <template v-else-if="item.icone === 'arquivos'">
              <path d="M14 3H6v18h12V9zM14 3v6h4M8 13h8M8 17h5" />
            </template>

            <template v-else-if="item.icone === 'quarentena'">
              <path d="m12 3 10 18H2L12 3Z" />
              <path d="M12 9v5m0 3h.01" />
            </template>

            <template v-else-if="item.icone === 'painel'">
              <path
                d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z"
              />
            </template>

            <template v-else-if="item.icone === 'monitoramento'">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </template>

            <template v-else>
              <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z" />
              <path d="M9 3v15M15 6v15" />
            </template>
          </svg>

          <span>{{ item.titulo }}</span>
        </RouterLink>
      </nav>
    </div>

    <footer class="sidebar-rodape">
      <div class="sidebar-usuario">
        <strong>{{ autenticacaoService.estado.nome }}</strong>
        <span>{{ autenticacaoService.estado.perfil }}</span>
      </div>

      <button
        type="button"
        class="sidebar-tema"
        :disabled="saindo"
        :aria-busy="saindo"
        @click="sair"
      >
        {{ saindo ? 'Saindo...' : 'Sair da conta' }}
      </button>

      <p
        v-if="erroSaida"
        role="alert"
        class="sidebar-erro"
      >
        {{ erroSaida }}
      </p>

      <button
        type="button"
        class="sidebar-tema"
        :aria-label="descricaoTema"
        :title="descricaoTema"
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
              <circle cx="12