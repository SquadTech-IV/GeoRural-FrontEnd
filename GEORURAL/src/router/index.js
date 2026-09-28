import { createRouter, createWebHistory } from 'vue-router'
import IngestaoFontes from '../views/IngestaoFontes.vue'
import VerificarDadosExistentes from '../views/VerificarDadosExistentes.vue'
import MapaResultado from '../views/MapaResultado.vue'

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
    },
    {
      path: '/resultado/:car',
      name: 'Resultado',
      component: MapaResultado,
      props: true,
    },
  ],
})

export default router
