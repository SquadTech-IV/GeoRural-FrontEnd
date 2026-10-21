import { createRouter, createWebHistory } from 'vue-router'

import ListaImoveis from '../views/ListaImoveis.vue'
import MapaIndicadores from '../views/MapaIndicadores.vue'
import Regras from '../views/Regras.vue'
import IngestaoPagina from '../views/Ingestao.vue'
import AuditoriaDados from '../views/AuditoriaDados.vue'

import ModalSalvarRegras from '../components/ModalSalvarRegras.vue'
import ModalDetalheVersao from '../components/ModalDetalheVersao.vue'
import ModalCompararVersoes from '../components/ModalCompararVersoes.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  routes: [
    {
      path: '/ingestao',
      name: 'Ingestao',
      component: IngestaoPagina,
    },
    {
      path: '/imoveis',
      name: 'Imoveis',
      component: ListaImoveis,
    },
    {
      path: '/mapa-indicadores/:car?',
      name: 'MapaIndicadores',
      component: MapaIndicadores,
      props: true,
    },
    {
      path: '/auditoria',
      name: 'AuditoriaDados',
      component: AuditoriaDados,
    },
    {
      path: '/',
      name: 'Regras',
      component: Regras,
      children: [
        {
          path: 'nova-versao',
          name: 'RegraNovaVersao',
          component: ModalSalvarRegras,
        },
        {
          path: 'detalhe-versao',
          name: 'RegraDetalheVersao',
          component: ModalDetalheVersao,
        },
        {
          path: 'comparar-versoes',
          name: 'RegraCompararVersoes',
          component: ModalCompararVersoes,
        },
      ],
    },
  ],
})

export default router
