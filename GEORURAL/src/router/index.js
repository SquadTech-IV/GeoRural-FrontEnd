import { createRouter, createWebHistory } from 'vue-router'
import IngestaoFontes from '../views/IngestaoFontes.vue'

import ProcessarDados from '../views/ProcessarDados.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'IngestaoFontes',
      component: IngestaoFontes,
    },
    {
      path: '/processar',
      name: 'ProcessarDados',
      component: ProcessarDados,
    },
  ],
})

export default router
