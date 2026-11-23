import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import autorizado from './directives/autorizado'

let temaInicial = 'light'

try {
  const temaSalvo = localStorage.getItem('georural-tema')

  if (temaSalvo === 'light' || temaSalvo === 'dark') {
    temaInicial = temaSalvo
  }
} catch {
  // Mantém o tema claro se o armazenamento estiver bloqueado.
}

document.documentElement.dataset.tema = temaInicial

const app = createApp(App)
app.directive('autorizado', autorizado)

app.use(createPinia())
app.use(router)

app.mount('#app')
