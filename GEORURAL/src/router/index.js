import {
  createRouter,
  createWebHistory,
} from 'vue-router'
<<<<<<< HEAD

import IngestaoFontes from '../views/IngestaoFontes.vue'
import ProcessarDados from '../views/ProcessarDados.vue'
import ArquivosRecebidos from '../views/ArquivosRecebidos.vue'
import DetalheArquivoRecebido from '../views/DetalheArquivoRecebido.vue'
import QualidadeDados from '../views/QualidadeDados.vue'
import AuditoriaDados from '../views/AuditoriaDados.vue'
import QuarentenaDados from '../views/QuarentenaDados.vue'
=======
>>>>>>> cba4571be93906c02346280169a1428756bbb4f0

const router = createRouter({
  history: createWebHistory(
    import.meta.env.BASE_URL,
  ),

  routes: [
    {
<<<<<<< HEAD
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
=======
      path: '/zona-tratada',
      name: 'ZonaTratadaDados',
      component: () =>
        import('../views/ZonaTratadaDados.vue'),
    },
    {
      path: '/arquivos-recebidos',
      name: 'ArquivosRecebidos',
      component: () =>
        import('../views/ArquivosRecebidos.vue'),
    },
    {
      path: '/arquivos-recebidos/:id',
      name: 'DetalheArquivoRecebido',
      component: () =>
        import('../views/DetalheArquivoRecebido.vue'),
      props: true,
    },
    {
      path: '/cadastros',
      name: 'Cadastros',
      component: () =>
        import('../views/Cadastros.vue'),
    },
    {
      path: '/ingestao',
      name: 'Ingestao',
      component: () =>
        import('../views/Ingestao.vue'),
    },
    {
      path: '/processar',
      name: 'ProcessarDados',
      component: () =>
        import('../views/ProcessarDados.vue'),
    },
    {
      path: '/qualidade',
      name: 'QualidadeDados',
      component: () =>
        import('../views/QualidadeDados.vue'),
    },
    {
      path: '/mapa-indicadores/:car?',
      name: 'MapaIndicadores',
      component: () =>
        import('../views/MapaIndicadores.vue'),
      props: true,
    },
    {
      path: '/resultado/:car',
      redirect: to => ({
        name: 'MapaIndicadores',
        params: {
          car: to.params.car,
        },
        query: to.query,
        hash: to.hash,
      }),
    },
    {
      path: '/imoveis',
      name: 'Imoveis',
      component: () =>
        import('../views/ListaImoveis.vue'),
>>>>>>> cba4571be93906c02346280169a1428756bbb4f0
    },
    {
      path: '/auditoria',
      name: 'AuditoriaDados',
<<<<<<< HEAD
      component: AuditoriaDados,
    },
    {
      path: '/quarentena',
      name: 'QuarentenaDados',
      component: QuarentenaDados,
=======
      component: () =>
        import('../views/AuditoriaDados.vue'),
    },
    {
      path: '/',
      name: 'Regras',
      component: () =>
        import('../views/Regras.vue'),
      children: [
        {
          path: 'nova-versao',
          name: 'RegraNovaVersao',
          component: () =>
            import('../components/ModalSalvarRegras.vue'),
        },
        {
          path: 'detalhe-versao',
          name: 'RegraDetalheVersao',
          component: () =>
            import('../components/ModalDetalheVersao.vue'),
        },
        {
          path: 'comparar-versoes',
          name: 'RegraCompararVersoes',
          component: () =>
            import('../components/ModalCompararVersoes.vue'),
        },
      ],
>>>>>>> cba4571be93906c02346280169a1428756bbb4f0
    },
    {
      path: '/rastreabilidade',
      name: 'Rastreabilidade',
      component: () =>
        import('../views/RastreabilidadeDados.vue'),
    },
  ],
})

export default router
