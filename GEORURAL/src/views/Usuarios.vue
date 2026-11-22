<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import BarraNavegacao from '../components/BarraNavegacao.vue'
import ModalUsuario from '../components/ModalUsuario.vue'
import ModalConfirmacao from '../components/ModalConfirmacao.vue'
import { criarControleUsuarios } from '../services/usuariosControleService'
import { podeReenviarConvite } from '../services/usuarioService'

defineOptions({ name: 'GestaoUsuarios' })
const controle = criarControleUsuarios()
const {
  usuarios, perfis, busca, filtroPerfil, filtroStatus, pagina, totalItens, totalPaginas, resumo,
  carregando, carregandoPerfis, ocupado, salvando, erroLista, erroPerfis, erroResumo, erroFormulario,
  feedback, modalAberto, usuarioSelecionado, confirmacao, erroAcao, divergencias, carregandoDivergencias,
  divergenciasConsultadas, erroDivergencias,
  carregar, carregarPerfis, abrirModal, salvarUsuario, solicitarAcao, cancelarAcao, confirmarAcao,
  consultarDivergencias, mudarPagina,
} = controle
onMounted(controle.iniciar)
onBeforeUnmount(controle.destruir)
</script>

<template>
  <div class="usuarios-page">
    <BarraNavegacao />
    <header class="topbar">
      <nav class="breadcrumb" aria-label="Navegação estrutural">
        <span>Administração</span>
        <span aria-hidden="true">/</span>
        <strong>Usuários</strong>
      </nav>

      <span class="environment">GeoRural</span>
    </header>

    <main class="content">
      <section class="page-heading">
        <div>
          <h1>Gestão de usuários</h1>

          <p>
            Gerencie as pessoas e os acessos à plataforma.
          </p>
        </div>

        <button
          class="button primary"
          type="button"
          :disabled="ocupado || carregandoPerfis || !perfis.length"
          v-autorizado="'administrar'"
          @click="abrirModal()"
        >
          <span aria-hidden="true">＋</span>
          Novo usuário
        </button>
      </section>

      <section class="stats" aria-label="Resumo dos usuários">
        <div class="stat">
          <strong>{{ resumo?.total ?? '—' }}</strong>
          <span>Total de usuários</span>
        </div>

        <div class="stat">
          <strong>{{ resumo?.ativos ?? '—' }}</strong>
          <span>Ativos</span>
        </div>

        <div class="stat">
          <strong>{{ resumo?.desativados ?? '—' }}</strong>
          <span>Desativados</span>
        </div>
      </section>

      <p v-if="erroResumo" class="feedback" role="alert">Resumo: {{ erroResumo }}</p>
      <p v-if="erroPerfis" class="feedback" role="alert">
        {{ erroPerfis }}
        <button type="button" class="button secondary" @click="carregarPerfis">Tentar carregar perfis</button>
      </p>

      <section class="users-panel" aria-labelledby="users-title">
        <div class="section-heading">
          <h2 id="users-title">Usuários cadastrados</h2>

          <p>
            Consulte e gerencie os acessos da sua equipe.
          </p>
          <button type="button" class="button secondary" :disabled="carregando || ocupado" @click="carregar">Atualizar</button>
        </div>

        <div class="filters">
          <label class="search">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m16 16 5 5" />
            </svg>

            <input
              v-model="busca"
              :disabled="ocupado"
              type="search"
              placeholder="Buscar por nome ou e-mail"
              aria-label="Buscar por nome ou e-mail"
            />
          </label>

          <select
            v-model="filtroPerfil"
            :disabled="ocupado || carregandoPerfis"
            aria-label="Filtrar por perfil"
          >
            <option value="">Todos os perfis</option>

            <option
              v-for="perfil in perfis"
              :key="perfil.id"
              :value="perfil.id"
            >
              {{ perfil.nome }}
            </option>
          </select>

          <select
            v-model="filtroStatus"
            :disabled="ocupado"
            aria-label="Filtrar por status"
          >
            <option value="">Todos os status</option>
            <option value="S">Ativo</option>
            <option value="N">Desativado</option>
          </select>
        </div>

        <p v-if="erroLista" class="feedback" role="alert">{{ erroLista }}</p>
        <div
          class="table-scroll"
          tabindex="0"
          role="region"
          aria-label="Tabela de usuários"
          :aria-busy="carregando"
        >
          <table>
            <thead>
              <tr>
                <th scope="col">Usuário</th>
                <th scope="col">Perfil</th>
                <th scope="col">Status</th>
                <th scope="col">Último acesso</th>
                <th scope="col" class="actions-heading">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody>
              <tr v-if="carregando"><td colspan="5" class="empty-state" role="status">Carregando usuários...</td></tr>
              <tr
                v-for="usuario in usuarios"
                :key="usuario.id"
              >
                <td>
                  <div class="person">
                    <span class="avatar" aria-hidden="true">
                      {{ usuario.iniciais }}
                    </span>

                    <div class="person-details">
                      <strong>{{ usuario.nome }}</strong>
                      <small>{{ usuario.email }}</small>
                      <small v-if="usuario.convitePendente === true">Definição de senha pendente</small>
                    </div>
                  </div>
                </td>

                <td>{{ usuario.perfil }}</td>

                <td>
                  <span
                    class="status"
                    :class="{ 'is-active': usuario.ativo }"
                  >
                    {{ usuario.ativo ? 'Ativo' : 'Desativado' }}
                  </span>
                </td>

                <td class="last-access">
                  {{ usuario.ultimoAcesso }}
                </td>

                <td>
                  <div class="row-actions">
                    <button
                      class="icon-button"
                      type="button"
                      :aria-label="`Editar ${usuario.nome}`"
                      :title="`Editar ${usuario.nome}`"
                      :disabled="ocupado || carregando || !perfis.length"
                      v-autorizado="'administrar'"
                      @click="abrirModal(usuario)"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15l-1 6Z"
                        />
                      </svg>
                    </button>

                    <button
                      class="icon-button"
                      type="button"
                      :aria-label="`${usuario.ativo ? 'Desativar' : 'Reativar'} ${usuario.nome}`"
                      :title="`${usuario.ativo ? 'Desativar' : 'Reativar'} ${usuario.nome}`"
                      :disabled="ocupado || carregando"
                      v-autorizado="'administrar'"
                      @click="solicitarAcao('status', usuario)"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M12 3v9M6.3 5.8a9 9 0 1 0 11.4 0"
                        />
                      </svg>
                    </button>
                    <button v-if="podeReenviarConvite(usuario)" class="button secondary" type="button"
                      :disabled="ocupado || carregando" :aria-label="`Reenviar convite para ${usuario.email}`"
                      @click="solicitarAcao('convite', usuario)">Reenviar convite</button>
                  </div>
                </td>
              </tr>

              <tr v-if="!carregando && !erroLista && !usuarios.length">
                <td colspan="5" class="empty-state">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer class="table-footer">
          <span role="status" aria-live="polite">
            Exibindo {{ usuarios.length }} de {{ totalItens }} usuários
            · Página {{ totalPaginas ? pagina + 1 : 0 }} de {{ totalPaginas }}
          </span>
          <div class="row-actions">
            <button type="button" class="button secondary" :disabled="carregando || ocupado || pagina === 0" @click="mudarPagina(pagina - 1)">Anterior</button>
            <button type="button" class="button secondary" :disabled="carregando || ocupado || pagina + 1 >= totalPaginas" @click="mudarPagina(pagina + 1)">Próxima</button>
          </div>
        </footer>
      </section>

      <section class="users-panel usuarios-divergencias" aria-labelledby="divergencias-titulo">
        <div class="section-heading">
          <h2 id="divergencias-titulo">Divergências de acesso</h2>
          <p>Confira inconsistências de cadastro, perfil ou status entre os serviços de acesso.</p>
          <button type="button" class="button secondary" :disabled="carregandoDivergencias || ocupado" @click="consultarDivergencias">
            {{ carregandoDivergencias ? 'Consultando...' : 'Consultar divergências' }}
          </button>
        </div>
        <p v-if="erroDivergencias" class="feedback" role="alert">{{ erroDivergencias }}</p>
        <p v-else-if="divergenciasConsultadas && !divergencias.length" class="empty-state">Nenhuma divergência encontrada.</p>
        <ul v-else-if="divergencias.length" class="usuarios-divergencias-lista">
          <li v-for="item in divergencias" :key="`${item.usuarioId}-${item.tipoDivergencia}`">
            <strong>{{ item.nome }} · {{ item.email }}</strong>
            <p>{{ item.descricao }}</p>
          </li>
        </ul>
      </section>

      <p class="feedback" role="status" aria-live="polite">
        {{ feedback }}
      </p>
    </main>

    <ModalUsuario
      v-model:aberto="modalAberto"
      :usuario="usuarioSelecionado"
      :perfis="perfis"
      :salvando="salvando"
      :erro-servidor="erroFormulario"
      @salvar="salvarUsuario"
    />
    <ModalConfirmacao v-if="confirmacao" :titulo="confirmacao.titulo" :mensagem="confirmacao.mensagem"
      :aviso="confirmacao.aviso" :erro="erroAcao" :rotulo-confirmar="confirmacao.rotulo"
      :rotulo-processando="confirmacao.processando" :processando="salvando"
      @cancelar="cancelarAcao" @confirmar="confirmarAcao" />
  </div>
</template>

<style scoped src="../assets/css/usuarios.css"></style>
