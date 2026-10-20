import { createRouter, createWebHistory } from 'vue-router'

import ArquivosRecebidos from '../views/ArquivosRecebidos.vue'
import DetalheArquivoRecebido from '../views/DetalheArquivoRecebido.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  routes: [
    {
      path: '/ingestao',
      redirect: {
        name: 'IngestaoFontes',
      },
    },
    {
      path: '/arquivos-recebidos',
      name: 'ArquivosRecebidos',
      component: ArquivosRecebidos,
    },
    {
      path: '/arquivos-recebidos/:id',
      name: 'DetalheArquivoRecebido',
      component: DetalheArquivoRecebido,
      props: true,
    },
  ],
})

export default router
