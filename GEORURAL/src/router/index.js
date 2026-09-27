import { createRouter, createWebHistory } from 'vue-router'
import IngestaoFontes from '../views/IngestaoFontes.vue'
import VerificarDadosExistentes from '../views/VerificarDadosExistentes.vue'


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'IngestaoFontes',
      component: IngestaoFontes,
    },
    {
      path: '/verificar-dados-existentes',
      name: 'VerificarDadosExistentes',
      component: VerificarDadosExistentes,
    }
  ],
})

export default router
