import { createRouter, createWebHistory } from 'vue-router'

import ZonaTratadaDados from '../views/ZonaTratadaDados.vue'
import ArquivosRecebidos from '../views/ArquivosRecebidos.vue'
import DetalheArquivoRecebido from '../views/DetalheArquivoRecebido.vue'
import Cadastros from '../views/Cadastros.vue'
import ProcessarDados from '../views/ProcessarDados.vue'
import QualidadeDados from '../views/QualidadeDados.vue'
import ListaImoveis from '../views/ListaImoveis.vue'
import MapaIndicadores from '../views/MapaIndicadores.vue'
import Regras from '../views/Regras.vue'
import IngestaoPagina from '../views/Ingestao.vue'
import AuditoriaDados from '../views/AuditoriaDados.vue'
import RastreabilidadeDados from '../views/RastreabilidadeDados.vue'

import ModalSalvarRegras from '../components/ModalSalvarRegras.vue'
import ModalDetalheVersao from '../components/ModalDetalheVersao.vue'
import ModalCompararVersoes from '../components/ModalCompararVersoes.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  routes: [
    { path: '/zona-tratada', name: 'ZonaTratadaDados', component: ZonaTratadaDados },
    { path: '/arquivos-recebidos', name: 'ArquivosRecebidos', component: ArquivosRecebidos },
    {
      path: '/arquivos-recebidos/:id',
      name: 'DetalheArquivoRecebido',
      component: DetalheArquivoRecebido,
      props: true,
    },
    { path: '/cadastros', name: 'Cadastros', component: Cadastros },
    {
      path: '/ingestao',
      name: 'Ingestao',
      component: IngestaoPagina,
    },
    {
      path: '/processar',
      name: 'ProcessarDados',
      component: ProcessarDados,
    },
    {
      path: '/qualidade',
      name: 'QualidadeDados',
      component: QualidadeDados,
    },
    {
      path: '/mapa-indicadores/:car?',
      name: 'MapaIndicadores',
      component: MapaIndicadores,
      props: true,
    },
    {
      path: '/imoveis',
      name: 'ListaImoveis',
      component: ListaImoveis,
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
    {
      path: '/rastreabilidade',
      name: 'Rastreabilidade',
      component: RastreabilidadeDados,
    },
  ],
})

export default router
