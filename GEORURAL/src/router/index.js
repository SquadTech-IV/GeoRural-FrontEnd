import {
  createRouter,
  createWebHistory,
} from 'vue-router'

import IngestaoFontes from '../views/IngestaoFontes.vue'
import ProcessarDados from '../views/ProcessarDados.vue'
import ArquivosRecebidos from '../views/ArquivosRecebidos.vue'
import DetalheArquivoRecebido from '../views/DetalheArquivoRecebido.vue'
import QualidadeDados from '../views/QualidadeDados.vue'
import AuditoriaDados from '../views/AuditoriaDados.vue'
import QuarentenaDados from '../views/QuarentenaDados.vue'

const router = createRouter({
  history: createWebHistory(
    import.meta.env.BASE_URL,
  ),

  routes: [
    {
      path: '/',
      name: 'IngestaoFontes',
      component: IngestaoFontes,
    },
    {
      path: '/ingestao',
      redirect: {
        name: 'IngestaoFontes',
      },
    },
    {
      path: '/processar',
      name: 'ProcessarDados',
      component: ProcessarDados,
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
    {
      path: '/qualidade',
      name: 'QualidadeDados',
      component: QualidadeDados,
    },
    {
      path: '/auditoria',
      name: 'AuditoriaDados',
      component: AuditoriaDados,
    },
    {
      path: '/quarentena',
      name: 'QuarentenaDados',
      component: QuarentenaDados,
    },
  ],
})

export default router
