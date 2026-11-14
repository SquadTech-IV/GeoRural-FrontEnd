<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { operacaoService } from '../services/PainelOperacaoService'

const props = defineProps({
  execucao: { type: Object, required: true },
})

const emit = defineEmits(['fechar', 'reprocessado'])

const ETAPAS = ['INGESTAO', 'VALIDACAO', 'TRATAMENTO', 'CALCULO', 'QUALIDADE', 'PUBLICACAO']

const etapas = ref([])
const carregando = ref(false)
const erro = ref('')
const erroReprocesso = ref('')
const reprocessando = ref(new Set())
const abriuCompleto = ref(false)

let sequencia = 0
function fmtData(valor) {
  if (!valor) return '—'
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return String(valor)
  return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function fmtDuracao(segundos) {
  if (segundos == null) return '—'
  if (segundos < 60) return `${segundos}s`
  return `${Math.floor(segundos / 60)}m ${String(segundos % 60).padStart(2, '0')}s`
}

function apresentarSituacao(valor) {
  const mapa = {
    CONCLUIDA: ['sucesso', 'Concluída'],
    COM_RESSALVA: ['aviso', 'Com ressalva'],
    FALHOU: ['erro', 'Falhou'],
    EM_ANDAMENTO: ['roxo', 'Em andamento'],
    PENDENTE: ['roxo', 'Aguardando'],
    NAO_RODOU: ['neutro', 'Não rodou'],
  }

  const [classe, texto] = mapa[valor] ?? ['neutro', valor || '—']
  return { classe, texto }
}

function montarEtapas(registros) {
  return ETAPAS.map((nome, i) => {
    const doBack = registros.filter((r) => r.etapa === nome)
    const ultima = doBack.at(-1)

    if (!ultima) {
      const manual = nome === 'PUBLICACAO'

      return {
        ordem: i + 1,
        nome,
        situacao: manual ? 'PENDENTE' : 'NAO_RODOU',
        tentativa: 0,
        duracao: '—',
        mensagem: manual ? 'publicação é manual: abra a conferência dos resultados' : 'não chegou a rodar',
      }
    }

    return {
      ordem: i + 1,
      nome,
      situacao: ultima.situacao,
      tentativa: doBack.length,
      duracao: fmtDuracao(ultima.duracaoSeg),
      mensagem: ultima.mensagem || '—',
    }
  })
}

const chaveEtapa = (nome) => `${props.execucao.dagRunId}:${nome}`

async function carregar() {
  const minha = ++sequencia

  carregando.value = true
  erro.value = ''

  try {
    const registros = await operacaoService.etapas(props.execucao.dagRunId)
    if (minha !== sequencia) return
    etapas.value = montarEtapas(registros)
  } catch (e) {
    if (minha !== sequencia) return
    erro.value = e.message
    etapas.value = []
  } finally {
    if (minha === sequencia) carregando.value = false
  }
}

async function reprocessar(etapa) {
  const chave = chaveEtapa(etapa.nome)

  reprocessando.value = new Set(reprocessando.value).add(chave)
  erroReprocesso.value = ''

  try {
    await operacaoService.reprocessarEtapa({
      etapa: etapa.nome,
      conjuntoId: props.execucao.conjuntoId,
      arquivoBrutoId: props.execucao.arquivoBrutoId,
      dagRunId: props.execucao.dagRunId,
    })

    await carregar()
    emit('reprocessado')
  } catch (e) {
    erroReprocesso.value = e.message
  } finally {
    const restante = new Set(reprocessando.value)
    restante.delete(chave)
    reprocessando.value = restante
  }
}

watch(() => props.execucao.dagRunId, () => {
  abriuCompleto.value = false
  erroReprocesso.value = ''
  carregar()
}, { immediate: true })

function aoPressionarTecla(evento) {
  if (evento.key === 'Escape') emit('fechar')
}

onMounted(() => document.addEventListener('keydown', aoPressionarTecla))

onBeforeUnmount(() => {
  sequencia++
  document.removeEventListener('keydown', aoPressionarTecla)
})
</script>

<template>
  <div class="pg-modal" role="dialog" aria-modal="true" @click.self="emit('fechar')">
    <div class="pg-modal-caixa">
      <header>
        <div>
          <h2>{{ execucao.conjuntoNome }} — {{ execucao.arquivoNome }}</h2>
          <p>
            {{ fmtData(execucao.inicio) }} ·
            {{ execucao.automatica ? 'automático' : 'manual, pela tela' }}<br />
            Identificador da execução: <code class="pg-mono">{{ execucao.dagRunId }}</code>
          </p>
        </div>

        <button type="button" class="pg-botao" @click="emit('fechar')">Fechar</button>
      </header>

      <p v-if="erro" class="pg-erro" role="alert">{{ erro }}</p>
      <p v-if="erroReprocesso" class="pg-erro" role="alert">{{ erroReprocesso }}</p>

      <p v-if="carregando" class="pg-vazio">Carregando etapas...</p>

      <div v-else-if="etapas.length" class="pg-rolagem">
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
            <tr v-for="et in etapas" :key="et.ordem">
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
                  :disabled="reprocessando.has(chaveEtapa(et.nome))" @click="reprocessar(et)">
                  {{ reprocessando.has(chaveEtapa(et.nome)) ? 'Reprocessando...' : 'Reprocessar esta etapa' }}
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
</template>

<style scoped src="../assets/css/modal-etapas-exeucao-operacao.css"></style>
