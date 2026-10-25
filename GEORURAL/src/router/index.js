import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  routes: [
    {
      path: '/quarentena',
      name: 'QuarentenaDados',
      component: () => import('../views/QuarentenaDados.vue'),
    },
    {
      path: '/zona-tratada',
      name: 'ZonaTratadaDados',
      component: () => import('../views/ZonaTratadaDados.vue'),
    },
    {
      path: '/arquivos-recebidos',
      name: 'ArquivosRecebidos',
      component: () => import('../views/ArquivosRecebidos.vue'),
    },
    {
      path: '/arquivos-recebidos/:id',
      name: 'DetalheArquivoRecebido',
      component: () => import('../views/DetalheArquivoRecebido.vue'),
      props: true,
    },
    {
      path: '/cadastros',
      name: 'Cadastros',
      component: () => import('../views/Cadastros.vue'),
    },
    {
      path: '/ingestao',
      name: 'Ingestao',
      component: () => import('../views/Ingestao.vue'),
    },
    {
      path: '/processar',
      name: 'ProcessarDados',
      component: () => import('../views/ProcessarDados.vue'),
    },
    {
      path: '/qualidade',
      name: 'QualidadeDados',
      component: () => import('../views/QualidadeDados.vue'),
    },
    {
      path: '/mapa-indicadores/:car?',
      name: 'MapaIndicadores',
      component: () => import('../views/MapaIndicadores.vue'),
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
      component: () => import('../views/ListaImoveis.vue'),
    },
    {
      path: '/auditoria',
      name: 'AuditoriaDados',
      component: () => import('../views/AuditoriaDados.vue'),
    },
    {
      path: '/',
      name: 'Regras',
      component: () => import('../views/Regras.vue'),
      children: [
        {
          path: 'nova-versao',
          name: 'RegraNovaVersao',
          component: () => import('../components/ModalSalvarRegras.vue'),
        },
        {
          path: 'detalhe-versao',
          name: 'RegraDetalheVersao',
          component: () => import('../components/ModalDetalheVersao.vue'),
        },
        {
          path: 'comparar-versoes',
          name: 'RegraCompararVersoes',
          component: () => import('../components/ModalCompararVersoes.vue'),
        },
      ],
    },
    {
      path: '/rastreabilidade',
      name: 'Rastreabilidade',
      component: () => import('../views/RastreabilidadeDados.vue'),
    },
  ],
})

export default router
