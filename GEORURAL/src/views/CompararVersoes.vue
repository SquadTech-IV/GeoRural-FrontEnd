<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import BarraNavegacao from '../components/BarraNavegacao.vue'
import {
  comparacaoVersoesService as service,
  mensagemErroComparacao,
  formatarValorComparacao as numero,
  rotulosComparacao as rotulos,
} from '../services/comparacaoVersoesService'

const versoes = ref([])
const sigla = ref('')
const versaoA = ref('')
const versaoB = ref('')
const apenasAlterados = ref(false)
const resultado = ref(null)
const carregando = ref(false)
const erro = ref('')
let controle
const indicadores = computed(() => [
  ...new Map(versoes.value.flatMap((v) => v.indicadores ?? []).map((i) => [i.sigla, i])).values(),
])
const disponiveis = computed(() =>
  versoes.value.filter((v) => v.indicadores?.some((i) => i.sigla === sigla.value)),
)
const campos = [
  { chave: 'percentual', nome: 'Percentual', unidade: '%' },
  { chave: 'hectares', nome: 'Área', unidade: 'ha' },
  { chave: 'absoluto', nome: 'Valor absoluto', unidade: '' },
]
const resumoCampos = {
  totalImoveis: 'Total de imóveis',
  iguais: 'Iguais',
  alterados: 'Alterados',
  apenasEmA: 'Apenas em A',
  apenasEmB: 'Apenas em B',
}

function iniciar() {
  controle?.abort()
  controle = new AbortController()
  resultado.value = null
  erro.value = ''
  carregando.value = true
  return controle
}
async function carregar() {
  const atual = iniciar()
  try {
    const dados = await service.listarVersoes({ signal: atual.signal })
    if (atual.signal.aborted) return
    versoes.value = dados
    sigla.value = indicadores.value[0]?.sigla ?? ''
    selecionarIndicador()
  } catch (e) {
    if (!atual.signal.aborted) erro.value = mensagemErroComparacao(e)
  } finally {
    if (controle === atual) carregando.value = false
  }
}
function selecionarIndicador() {
  controle?.abort()
  carregando.value = false
  resultado.value = null
  erro.value = ''
  versaoA.value = disponiveis.value[0]?.versaoId ?? ''
  versaoB.value = disponiveis.value[1]?.versaoId ?? ''
}
async function comparar(pagina = 0) {
  const atual = iniciar()
  try {
    const dados = await service.comparar(
      {
        indicador: sigla.value,
        versaoA: versaoA.value,
        versaoB: versaoB.value,
        apenasAlterados: apenasAlterados.value,
        pagina,
      },
      { signal: atual.signal },
    )
    if (!atual.signal.aborted) resultado.value = dados
  } catch (e) {
    if (!atual.signal.aborted) erro.value = mensagemErroComparacao(e)
  } finally {
    if (controle === atual) carregando.value = false
  }
}
function invalidar() {
  controle?.abort()
  carregando.value = false
  resultado.value = null
  erro.value = ''
}
onMounted(carregar)
onBeforeUnmount(() => controle?.abort())
</script>

<template>
  <div class="pg-layout">
    <BarraNavegacao />
    <main class="pg-pagina" :aria-busy="carregando">
      <header class="pg-cabecalho">
        <h1>O que mudou entre duas versões</h1>
        <p>
          Compare versões publicadas do mesmo indicador e consulte os motivos das mudanças por
          imóvel. As diferenças representam B − A.
        </p>
      </header>
      <form class="pg-filtros" @submit.prevent="comparar(0)">
        <label class="pg-campo"
          ><span>Indicador</span
          ><select v-model="sigla" @change="selecionarIndicador">
            <option value="" disabled>Selecione</option>
            <option v-for="i in indicadores" :key="i.sigla" :value="i.sigla">
              {{ i.sigla }} — {{ i.nome }}
            </option>
          </select></label
        >
        <label v-for="lado in ['A', 'B']" :key="lado" class="pg-campo"
          ><span>Versão {{ lado }}</span>
          <select
            :value="lado === 'A' ? versaoA : versaoB"
            @change="
              (e) => {
                invalidar()
                lado === 'A' ? (versaoA = e.target.value) : (versaoB = e.target.value)
              }
            "
          >
            <option value="" disabled>Selecione</option>
            <option v-for="v in disponiveis" :key="v.versaoId" :value="v.versaoId">
              v{{ v.numero }} · {{ v.competencia }} · {{ v.conjuntoNome }} · {{ v.situacao }}
            </option>
          </select>
        </label>
        <label
          ><input v-model="apenasAlterados" type="checkbox" @change="invalidar" /> Somente alterados
          ou exclusivos</label
        >
        <button
          type="submit"
          :disabled="carregando || !versaoA || !versaoB || String(versaoA) === String(versaoB)"
        >
          Comparar
        </button>
      </form>
      <p v-if="carregando" role="status">Carregando…</p>
      <p v-if="erro" role="alert">
        {{ erro }}
        <button type="button" @click="versoes.length ? comparar(0) : carregar()">
          Tentar novamente
        </button>
      </p>
      <p v-if="!carregando && !erro && disponiveis.length < 2">
        São necessárias duas versões publicadas com resultados do mesmo indicador.
      </p>
      <template v-if="resultado">
        <section class="pg-bloco">
          <h2>Resumo</h2>
          <dl class="resumo">
            <div v-for="(nome, chave) in resumoCampos" :key="chave">
              <dt>{{ nome }}</dt>
              <dd>{{ numero(resultado.resumo[chave]) }}</dd>
            </div>
          </dl>
        </section>
        <section class="pg-bloco">
          <h2>Motivos da mudança</h2>
          <article v-for="(motivo, index) in resultado.motivos" :key="index">
            <h3>{{ rotulos[motivo.tipo] ?? motivo.tipo }}</h3>
            <p>{{ motivo.descricao }}</p>
            <ul>
              <li v-for="detalhe in motivo.detalhes" :key="detalhe">{{ detalhe }}</li>
            </ul>
          </article>
          <p v-if="!resultado.motivos?.length">Nenhum motivo de mudança registrado.</p>
          <div v-if="resultado.lacunas?.length">
            <h3>Lacunas de rastreabilidade</h3>
            <ul>
              <li v-for="lacuna in resultado.lacunas" :key="lacuna">{{ lacuna }}</li>
            </ul>
          </div>
        </section>
        <section class="versoes-detalhes">
          <article v-for="lado in ['A', 'B']" :key="lado" class="pg-bloco">
            <h2>Versão {{ lado }} · v{{ resultado['versao' + lado].numero }}</h2>
            <dl>
              <template
                v-for="(nome, campo) in {
                  versaoId: 'Identificador',
                  conjuntoNome: 'Conjunto',
                  fonteNome: 'Fonte',
                  competencia: 'Competência',
                  situacao: 'Situação',
                  dataPublicacao: 'Publicação',
                  hash: 'Hash',
                  execucaoId: 'Execução',
                  dagRunId: 'Rodada',
                }"
                :key="campo"
                ><dt>{{ nome }}</dt>
                <dd>{{ resultado['versao' + lado][campo] ?? 'Não informado' }}</dd></template
              >
            </dl>
            <h3>Regra e parâmetros</h3>
            <template v-if="resultado['versao' + lado].regra"
              ><p>
                {{ resultado['versao' + lado].regra.versao }} ·
                {{ resultado['versao' + lado].regra.formula }}
              </p>
              <ul>
                <li v-for="p in resultado['versao' + lado].regra.parametros" :key="p.nome">
                  {{ p.rotulo || p.nome }}: {{ p.valor }} {{ p.unidade }}
                </li>
              </ul></template
            >
            <p v-else>Regra não registrada.</p>
            <h3>Dados de origem</h3>
            <ul>
              <li v-for="entrada in resultado['versao' + lado].entradas" :key="entrada.versaoId">
                {{ entrada.conjuntoNome }} · {{ entrada.fonteNome }} · v{{ entrada.numero }} ({{
                  entrada.versaoId
                }}) · {{ entrada.competencia }}
                <p class="hash">{{ entrada.hash ?? 'Hash não informado' }}</p>
              </li>
            </ul>
          </article>
        </section>
        <section class="pg-bloco">
          <h2>Comparação por imóvel</h2>
          <p>{{ resultado.imoveis.totalItens }} imóveis encontrados</p>
          <div class="tabela-rolagem">
            <table>
              <thead>
                <tr>
                  <th>CAR / imóvel</th>
                  <th>Situação</th>
                  <th>A</th>
                  <th>B</th>
                  <th>Diferença B − A</th>
                  <th>Motivos</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="imovel in resultado.imoveis.itens" :key="imovel.imovelId">
                  <td>{{ imovel.codigoCar }}<br />{{ imovel.nome }}</td>
                  <td>{{ rotulos[imovel.situacao] ?? imovel.situacao }}</td>
                  <td v-for="campo in ['valorA', 'valorB', 'diferenca']" :key="campo">
                    <template v-if="imovel[campo]"
                      ><div v-for="metrica in campos" :key="metrica.chave">
                        {{ metrica.nome }}:
                        {{
                          numero(
                            imovel[campo][metrica.chave],
                            campo === 'diferenca' && metrica.chave === 'percentual'
                              ? 'p.p.'
                              : metrica.unidade,
                          )
                        }}
                      </div>
                      <div v-if="campo !== 'diferenca'">
                        {{ imovel[campo].situacao ?? 'Situação não informada' }}
                      </div></template
                    ><span v-else>Ausente</span>
                  </td>
                  <td>
                    {{
                      imovel.motivos?.map((m) => rotulos[m] ?? m).join(', ') || 'Nenhum registrado'
                    }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="!resultado.imoveis.itens.length">Nenhum imóvel encontrado para este filtro.</p>
          <nav class="paginacao" aria-label="Páginas da comparação">
            <button
              :disabled="carregando || resultado.imoveis.primeira"
              @click="comparar(resultado.imoveis.pagina - 1)"
            >
              Anterior</button
            ><span
              >Página {{ resultado.imoveis.pagina + 1 }} de
              {{ resultado.imoveis.totalPaginas || 1 }}</span
            ><button
              :disabled="carregando || resultado.imoveis.ultima"
              @click="comparar(resultado.imoveis.pagina + 1)"
            >
              Próxima
            </button>
          </nav>
        </section>
      </template>
    </main>
  </div>
</template>

<style scoped src="../assets/css/comparar-versoes.css"></style>
<style scoped>
.versoes-detalhes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.resumo,
.paginacao {
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
}
dd {
  margin: 4px 0 14px;
  overflow-wrap: anywhere;
}
dt {
  font-weight: 600;
}
.hash {
  overflow-wrap: anywhere;
}
.tabela-rolagem {
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  text-align: left;
  padding: 12px;
  border-bottom: 1px solid var(--cor-borda);
  vertical-align: top;
  min-width: 140px;
}
button {
  padding: 9px 14px;
  border: 1px solid var(--cor-borda);
  border-radius: 8px;
  background: var(--cor-painel);
  color: var(--cor-texto);
  cursor: pointer;
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
@media (max-width: 760px) {
  .versoes-detalhes {
    grid-template-columns: 1fr;
  }
}
</style>
