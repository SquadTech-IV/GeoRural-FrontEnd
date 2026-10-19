import { createRouter, createWebHistory } from 'vue-router'
import IngestaoFontes from '../views/IngestaoFontes.vue'
import VerificarDadosExistentes from '../views/VerificarDadosExistentes.vue'
import ListaImoveis from '../views/ListaImoveis.vue'
import MapaResultado from '../views/MapaResultado.vue'
import Regras from '../views/Regras.vue'
import ModalSalvarRegras from '../components/ModalSalvarRegras.vue'
import ModalDetalheVersao from '../components/ModalDetalheVersao.vue'
import ModalCompararVersoes from '../components/ModalCompararVersoes.vue'
import RastreabilidadeDados from '../views/RastreabilidadeDados.vue'

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
      path: '/imoveis',
      name: 'Imoveis',
      component: ListaImoveis,
    },
    {
      path: '/resultado/:car',
      name: 'Resultado',
      component: MapaResultado,
      props: true,
    },
    {
      path: '/regras',
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
    {
      path: '/rastreabilidade',
      name: 'Rastreabilidade',
      component: RastreabilidadeDados,
    },
  ],
})

export default router
