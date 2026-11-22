<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import logo from '@/assets/LogoSquadTech.png'

defineOptions({
  name: 'LOGIN',
})

const email = ref('')
const senha = ref('')
const lembrar = ref(false)
const mostrarSenha = ref(false)
const mensagem = ref('')

const recursos = [
  {
    titulo: 'Gestão de dados',
    descricao: 'Organize arquivos e acompanhe as etapas de processamento.',
    icone: 'dados',
  },
  {
    titulo: 'Análise territorial',
    descricao: 'Explore imóveis, municípios e indicadores geoespaciais.',
    icone: 'mapa',
  },
  {
    titulo: 'Rastreabilidade',
    descricao: 'Consulte a origem e a trajetória dos dados na plataforma.',
    icone: 'trilha',
  },
]

onMounted(() => {
  document.body.classList.add('pagina-login')
})

onUnmounted(() => {
  document.body.classList.remove('pagina-login')
})

function recuperarSenha() {
  mensagem.value =
    'Entre em contato com a equipe responsável pelo GeoRural para recuperar seu acesso.'
}
</script>

<template>
  <main class="login-page">
    <section class="login-card" aria-label="Acesso ao GeoRural">
      <aside class="presentation">
        <div class="brand">
          <img :src="logo" alt="Logo GeoRural" />
          <span>Geo<strong>Rural</strong></span>
        </div>

        <div class="presentation-content">

          <h1>
            Uma visão mais completa
            <span>do seu território.</span>
          </h1>

          <p class="presentation-description">
            Reúna informações, acompanhe processos e explore dados
            geoespaciais em um só lugar.
          </p>

          <ul class="feature-list">
            <li v-for="recurso in recursos" :key="recurso.titulo">
              <span class="feature-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <template v-if="recurso.icone === 'dados'">
                    <ellipse cx="12" cy="5" rx="8" ry="3" />
                    <path d="M4 5v7c0 4 16 4 16 0V5" />
                    <path d="M4 12v7c0 4 16 4 16 0v-7" />
                  </template>

                  <template v-else-if="recurso.icone === 'mapa'">
                    <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" />
                    <path d="M9 3v15M15 6v15" />
                  </template>

                  <template v-else>
                    <circle cx="6" cy="5" r="2" />
                    <circle cx="18" cy="12" r="2" />
                    <circle cx="6" cy="19" r="2" />
                    <path d="M6 7v10M8 5h3a7 7 0 0 1 7 5" />
                    <path d="M8 19h3a7 7 0 0 0 7-5" />
                  </template>
                </svg>
              </span>

              <div>
                <h2>{{ recurso.titulo }}</h2>
                <p>{{ recurso.descricao }}</p>
              </div>
            </li>
          </ul>
        </div>

        <p class="presentation-footer">
          Dados conectados para decisões mais informadas.
        </p>
      </aside>

      <section class="access" aria-labelledby="login-title">
        <header class="login-header">
          <span class="access-label">ACESSO À PLATAFORMA</span>
          <p>
            Informe suas credenciais.
          </p>
        </header>

        <form class="login-form" @submit.prevent="entrar">
          <div class="field">
            <label for="email">E-mail</label>

            <input
              id="email"
              v-model="email"
              type="email"
              name="email"
              placeholder="seu@email.com"
              autocomplete="username"
              required
            />
          </div>

          <div class="field">
            <label for="senha">Senha</label>

            <div class="password-field">
              <input
                id="senha"
                v-model="senha"
                :type="mostrarSenha ? 'text' : 'password'"
                name="senha"
                placeholder="Digite sua senha"
                autocomplete="current-password"
                required
              />

              <button
                class="password-toggle"
                type="button"
                :aria-label="mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'"
                :aria-pressed="mostrarSenha"
                @click="mostrarSenha = !mostrarSenha"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  aria-hidden="true"
                >
                  <path
                    d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
                  />
                  <circle cx="12" cy="12" r="3" />
                  <path v-if="mostrarSenha" d="m3 3 18 18" />
                </svg>
              </button>
            </div>
          </div>

          <div class="form-options">
            <label class="remember">
              <input v-model="lembrar" type="checkbox" name="lembrar" />
              Lembrar de mim
            </label>

            <button
              class="text-button"
              type="button"
              @click="recuperarSenha"
            >
              Esqueci minha senha
            </button>
          </div>

          <button class="submit-button" type="submit">
            Entrar na plataforma
          </button>

          <p
            v-if="mensagem"
            class="login-message"
            role="status"
            aria-live="polite"
          >
            {{ mensagem }}
          </p>
        </form>
      </section>
    </section>

    <footer class="login-footer">
      <span>© {{ new Date().getFullYear() }} GeoRural</span>
    </footer>
  </main>
</template>


<style scoped src="../assets/css/login.css"></style>
