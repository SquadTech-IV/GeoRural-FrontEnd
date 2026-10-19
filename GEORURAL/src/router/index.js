import { createRouter, createWebHistory } from 'vue-router'

import ListaImoveis from '../views/ListaImoveis.vue'
import MapaResultado from '../views/MapaResultado.vue'
import Regras from '../views/Regras.vue'
import Cadastros from '../views/Cadastros.vue'
import IngestaoFontes from '../views/IngestaoFontes.vue'

import ModalSalvarRegras from '../components/ModalSalvarRegras.vue'
import ModalDetalheVersao from '../components/ModalDetalheVersao.vue'
import ModalCompararVersoes from '../components/ModalCompararVersoes.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  routes: [
    {
      path: '/cadastros',
      name: 'Cadastros',
      component: Cadastros,
    },
    {
      path: '/ingestao-fontes',
      name: 'IngestaoFontes',
      component: IngestaoFontes,
    },
    {
      path: '/resultado/:car',
      name: 'Resultado',
      component: MapaResultado,
      props: true,
    },
    {
      path: '/imoveis',
      name: 'Imoveis',
      component: ListaImoveis,
    },
    {
      path: '/mapa-indicadores/:car?',
      name: 'MapaIndicadores',
      redirect: (to) => to.params.car
        ? { name: 'Resultado', params: { car: to.params.car } }
        : { name: 'Imoveis' },
    },
    {
      path: '/',
      name: 'Regras',
      alias: '/regras',
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
