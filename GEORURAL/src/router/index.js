import { createRouter, createWebHistory } from 'vue-router'
import IngestaoFontes from '../views/IngestaoFontes.vue'


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'IngestaoFontes',
      component: IngestaoFontes,
    },
  ],
})

export default router
