<script setup>

</script>

<template>
  <div>
    <BarraNavegacao />

    <main class="pg-pagina">
      <header class="pg-cabecalho">
        <h1>Painel da operação</h1>
      </header>

      <section class="pg-filtros" aria-label="Filtros do painel">
        <label class="pg-campo">
          <span>Período</span>
          <select v-model="periodo">
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
          </select>
        </label>

        <label class="pg-campo">
          <span>Situação</span>
          <select v-model="situacao">
            <option value="">Todas</option>
            <option value="FALHOU">Só as que falharam</option>
            <option value="COM_RESSALVA">Com ressalva</option>
            <option value="CONCLUIDA">Concluídas</option>
          </select>
        </label>

        <label class="pg-campo">
          <span>Conjunto</span>
          <select v-model="conjunto">
            <option value="">Todos</option>
            <option v-for="item in conjuntos" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>

        <button type="button" class="pg-botao" :disabled="atualizando" @click="atualizar">
          {{ atualizando ? 'Atualizando...' : 'Atualizar' }}
        </button>
      </section>

      <section class="pg-cards" aria-label="Resumo da operação">
        <article>
          <strong>{{ conjuntosPublicados }}</strong>
          <span>conjuntos publicados</span>
          <small>com versão vigente</small>
        </article>

        <article>
          <strong>{{ lista.length }}</strong>
          <span>execuções no período</span>
          <small>{{ automaticas }} automáticas, {{ lista.length - automaticas }} manuais</small>
        </article>

        <article :class="{ 'pg-card--alerta': falhas.length }">
          <strong>{{ falhas.length }}</strong>
          <span>falharam</span>
          <small>{{ falhaMaisAntiga }}</small>
        </article>

        <article>
          <strong>{{ fmt(QUARENTENA_PENDENTE) }}</strong>
          <span>na quarentena</span>
          <small>pendentes de resolução</small>
        </article>

        <article>
          <strong>{{ DURACAO_MEDIA }}</strong>
          <span>duração média</span>
          <small>da rodada completa</small>
        </article>
      </section>

      <section class="pg-bloco">
        <div class="pg-bloco-topo">
          <h2>Execuções do pipeline</h2>
          <span>{{ lista.length }} {{ lista.length === 1 ? 'execução' : 'execuções' }}</span>
        </div>

        <p class="pg-ajuda">
          Clique numa linha para ver as seis etapas daquela rodada e, se alguma
          falhou, reprocessar só ela.
        </p>

        <div class="pg-rolagem">
          <table class="pg-tabela">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Conjunto e arquivo</th>
                <th>Origem</th>
                <th class="num">Feições</th>
                <th class="num">Quarentena</th>
                <th>Versão</th>
                <th>Situação</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="e in lista" :key="e.id" @click="abrir(e)">
                <td>
                  {{ e.quando }}
                  <small class="pg-mono">{{ e.id.slice(0, 26) }}</small>
                </td>

                <td>
                  <strong>{{ e.conjunto }}</strong>
                  <small>{{ e.arquivo }}</small>
                </td>

                <td>
                  <template v-if="e.automatica">
                    <span class="pg-selo pg-selo--roxo">automático</span>
                    <small>{{ e.dag }}</small>
                  </template>
                  <template v-else>
                    <span class="pg-selo pg-selo--neutro">manual</span>
                    <small>pela tela</small>
                  </template>
                </td>

                <td class="num">{{ fmt(e.recebidas) }}</td>
                <td class="num">{{ fmt(e.rejeitadas) }}</td>
                <td>{{ e.versao ? `#${e.versao}` : '—' }}</td>

                <td>
                  <span class="pg-selo" :class="`pg-selo--${apresentarSituacao(e.situacao).classe}`">
                    {{ apresentarSituacao(e.situacao).texto }}
                  </span>
                  <small v-if="e.etapaFalha">em {{ e.etapaFalha }}</small>
                </td>
              </tr>

              <tr v-if="!lista.length" class="pg-linha-vazia">
                <td colspan="7" class="pg-vazio">Nenhuma execução neste filtro.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer class="pg-rodape">
          <span>Mostrando as {{ lista.length }} execuções mais recentes do período.</span>
          <button type="button" class="pg-botao" disabled>Carregar mais</button>
        </footer>
      </section>
    </main>
    <div v-if="execucaoAberta" class="pg-modal" role="dialog" aria-modal="true" @click.self="fechar">
      <div class="pg-modal-caixa">
        <header>
          <div>
            <h2>{{ execucaoAberta.conjunto }} — {{ execucaoAberta.arquivo }}</h2>
            <p>
              {{ execucaoAberta.quando }} ·
              {{ execucaoAberta.automatica ? `automático · DAG ${execucaoAberta.dag}` : 'manual, pela tela' }}<br />
              Identificador da execução: <code class="pg-mono">{{ execucaoAberta.id }}</code>
            </p>
          </div>

          <button type="button" class="pg-botao" @click="fechar">Fechar</button>
        </header>

        <div class="pg-rolagem">
          <table class="pg-tabela">
            <thead>
              <tr>
                <th>Etapa</th>
                <th>Situação</th>
                <th class="num">Tentativa</th>
                <th class="num">Duração</th>
                <th>Mensagem</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="et in execucaoAberta.etapas" :key="et.ordem">
                <td><strong>{{ et.ordem }}. {{ et.nome }}</strong></td>

                <td>
                  <span class="pg-selo" :class="`pg-selo--${apresentarSituacao(et.situacao).classe}`">
                    {{ apresentarSituacao(et.situacao).texto }}
                  </span>
                </td>

                <td class="num">{{ et.tentativa || '—' }}</td>
                <td class="num">{{ et.duracao }}</td>
                <td>{{ et.mensagem }}</td>

                <td>
                  <button v-if="et.situacao === 'FALHOU'" type="button" class="pg-botao"
                    :disabled="reprocessando.has(chaveEtapa(execucaoAberta, et))"
                    @click="reprocessar(execucaoAberta, et)">
                    {{ reprocessando.has(chaveEtapa(execucaoAberta, et)) ? 'Reprocessando...' : 'Reprocessar esta etapa' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="pg-ajuda">
          Reprocessar uma etapa reaproveita o que as anteriores já deixaram pronto:
          não refaz a rodada inteira.
        </p>

        <div class="pg-modal-rodape">
          <span class="pg-ajuda pg-ajuda--solta">Esta é a visão resumida da rodada.</span>

          <button type="button" class="pg-botao pg-botao--principal" @click="abriuCompleto = true">
            {{ abriuCompleto ? 'Abriria /auditoria' : 'Ver completo na linhagem e auditoria' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped src="../assets/css/painel-operacao.css"></style>
