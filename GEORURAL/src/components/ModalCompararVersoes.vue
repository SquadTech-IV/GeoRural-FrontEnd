<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()

const props = defineProps({
  indicador: {
    type: Object,
    default: null,
  },
  carregando: {
    type: Boolean,
    default: false,
  },
  erro: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['tentar-novamente'])

const primeiraVersao = ref('')
const segundaVersao = ref('')

function valorQuery(valor) {
  return Array.isArray(valor) ? valor[0] : valor
}

function identificadorVersao(versao) {
  return String(versao.id ?? versao.numero)
}

function nomeVersao(versao) {
  if (!versao) return '—'

  return versao.numero != null
    ? `v${versao.numero}`
    : String(versao.id)
}

const indicadorCorreto = computed(() => {
  const id = valorQuery(route.query.indicador)

  return Boolean(
    props.indicador &&
    id != null &&
    String(props.indicador.id) === String(id),
  )
})

const versoes = computed(() => {
  if (
    !indicadorCorreto.value ||
    !Array.isArray(props.indicador.versoes)
  ) {
    return []
  }

  return [...props.indicador.versoes]
    .filter((versao) => versao.id != null || versao.numero != null)
    .sort((a, b) =>
      String(b.criadaEm ?? '').localeCompare(
        String(a.criadaEm ?? ''),
      ),
    )
})

watch(
  versoes,
  (lista) => {
    const ids = lista.map(identificadorVersao)

    if (!ids.includes(primeiraVersao.value)) {
      primeiraVersao.value = ids[0] ?? ''
    }

    if (!ids.includes(segundaVersao.value)) {
      segundaVersao.value =
        ids.find((id) => id !== primeiraVersao.value) ?? ''
    }
  },
  { immediate: true },
)

const versaoA = computed(() =>
  versoes.value.find(
    (versao) =>
      identificadorVersao(versao) === primeiraVersao.value,
  ) ?? null,
)

const versaoB = computed(() =>
  versoes.value.find(
    (versao) =>
      identificadorVersao(versao) === segundaVersao.value,
  ) ?? null,
)

const mesmaVersao = computed(() =>
  primeiraVersao.value !== '' &&
  primeiraVersao.value === segundaVersao.value,
)

const podeComparar = computed(() =>
  Boolean(
    versaoA.value &&
    versaoB.value &&
    !mesmaVersao.value,
  ),
)

function mapaParametros(versao) {
  const lista = Array.isArray(versao?.parametros)
    ? versao.parametros
    : []

  return new Map(
    lista.map((parametro) => [
      String(parametro.id),
      parametro,
    ]),
  )
}

function definicaoParametro(id) {
  const lista = props.indicador?.parametros

  if (!Array.isArray(lista)) return null

  return lista.find(
    (parametro) => String(parametro.id) === id,
  ) ?? null
}

function valorNormalizado(parametro, tipo) {
  if (!parametro) return 'ausente'

  const valor = parametro.valor

  if (valor == null || valor === '') return 'vazio'

  if (tipo === 'data') {
    return `data:${String(valor).slice(0, 10)}`
  }

  if (tipo === 'numero' || tipo === 'percentual') {
    const numero = Number(valor)

    if (Number.isFinite(numero)) {
      return `numero:${numero}`
    }
  }

  return `texto:${String(valor)}`
}

const linhas = computed(() => {
  if (!podeComparar.value) return []

  const parametrosA = mapaParametros(versaoA.value)
  const parametrosB = mapaParametros(versaoB.value)

  const ids = new Set([
    ...parametrosA.keys(),
    ...parametrosB.keys(),
  ])

  return [...ids].map((id) => {
    const parametroA = parametrosA.get(id)
    const parametroB = parametrosB.get(id)
    const definicao = definicaoParametro(id)

    const tipoA = parametroA?.tipo ?? definicao?.tipo
    const tipoB = parametroB?.tipo ?? definicao?.tipo

    const unidadeA = parametroA?.unidade ?? definicao?.unidade
    const unidadeB = parametroB?.unidade ?? definicao?.unidade

    let situacao = 'Igual'

    if (!parametroA) {
      situacao = 'Somente na segunda versão'
    } else if (!parametroB) {
      situacao = 'Somente na primeira versão'
    } else if (
      valorNormalizado(parametroA, tipoA) !==
        valorNormalizado(parametroB, tipoB) ||
      tipoA !== tipoB ||
      unidadeA !== unidadeB
    ) {
      situacao = 'Alterado'
    }

    return {
      id,
      nome:
        parametroA?.nome ||
        parametroB?.nome ||
        definicao?.nome ||
        id,
      parametroA,
      parametroB,
      tipoA,
      tipoB,
      unidadeA,
      unidadeB,
      situacao,
      diferente: situacao !== 'Igual',
    }
  })
})

const quantidadeDiferencas = computed(() =>
  linhas.value.filter((linha) => linha.diferente).length,
)

const parametrosDisponiveis = computed(() =>
  Array.isArray(versaoA.value?.parametros) &&
  Array.isArray(versaoB.value?.parametros),
)

const formulasDisponiveis = computed(() =>
  typeof versaoA.value?.formula === 'string' &&
  typeof versaoB.value?.formula === 'string',
)

const formulasDiferentes = computed(() =>
  formulasDisponiveis.value &&
  versaoA.value.formula.trim() !== versaoB.value.formula.trim(),
)

function formatarData(valor) {
  if (!valor) return '—'

  const partes = String(valor).match(
    /^(\d{4})-(\d{2})-(\d{2})/,
  )

  return partes
    ? `${partes[3]}/${partes[2]}/${partes[1]}`
    : '—'
}

function formatarValor(parametro, tipo, unidade) {
  if (!parametro) return 'Não consta'

  const valor = parametro.valor

  if (valor == null || valor === '') return '—'

  if (tipo === 'data') {
    return formatarData(valor)
  }

  const numero = Number(valor)
  const texto =
    (tipo === 'numero' || tipo === 'percentual') &&
    Number.isFinite(numero)
      ? numero.toLocaleString('pt-BR')
      : String(valor)

  return `${texto}${unidade ? ` ${unidade}` : ''}`
}
</script>

<template>
  <Teleport to="body">
    <div class="regras-overlay">
      <section
        class="regras-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-modal-comparacao"
        :aria-busy="carregando"
      >
        <RouterLink
          :to="{ name: 'Regras' }"
          class="regras-modal-fechar"
          aria-label="Fechar"
        >
          ×
        </RouterLink>

        <h2 id="titulo-modal-comparacao">
          Comparar versões
        </h2>

        <p
          v-if="carregando"
          class="regras-texto-secundario"
          role="status"
        >
          Carregando versões...
        </p>

        <div v-else-if="erro" role="alert">
          <p class="regras-erro">
            {{ erro }}
          </p>

          <button
            type="button"
            class="regras-botao"
            @click="emit('tentar-novamente')"
          >
            Tentar novamente
          </button>
        </div>

        <p
          v-else-if="!indicadorCorreto"
          class="regras-texto-secundario"
        >
          Os dados do indicador não estão disponíveis.
          Volte à tela de regras e selecione o indicador.
        </p>

        <p
          v-else-if="versoes.length < 2"
          class="regras-texto-secundario"
        >
          É necessário carregar pelo menos duas versões
          para realizar a comparação.
        </p>

        <template v-else>
          <p class="regras-texto-secundario">
            {{ indicador.codigo }} · {{ indicador.nome }}
          </p>

          <div class="regras-comparacao-seletores">
            <label for="comparacao-primeira">
              Primeira versão

              <select
                id="comparacao-primeira"
                v-model="primeiraVersao"
              >
                <option
                  v-for="versao in versoes"
                  :key="identificadorVersao(versao)"
                  :value="identificadorVersao(versao)"
                >
                  {{ nomeVersao(versao) }}
                </option>
              </select>
            </label>

            <label for="comparacao-segunda">
              Segunda versão

              <select
                id="comparacao-segunda"
                v-model="segundaVersao"
              >
                <option
                  v-for="versao in versoes"
                  :key="identificadorVersao(versao)"
                  :value="identificadorVersao(versao)"
                >
                  {{ nomeVersao(versao) }}
                </option>
              </select>
            </label>
          </div>

          <p
            v-if="mesmaVersao"
            class="regras-aviso"
            role="status"
          >
            Selecione versões diferentes para comparar.
          </p>

          <template v-else-if="podeComparar">
            <h3 class="regras-secao-titulo">
              Parâmetros
            </h3>

            <p
              v-if="!parametrosDisponiveis"
              class="regras-aviso"
            >
              Os parâmetros de uma ou das duas versões não foram
              carregados. A comparação abaixo pode estar incompleta.
            </p>

            <div
              v-if="linhas.length"
              class="regras-tabela-container"
            >
              <table class="regras-tabela">
                <thead>
                  <tr>
                    <th scope="col">Parâmetro</th>
                    <th scope="col">
                      {{ nomeVersao(versaoA) }}
                    </th>
                    <th scope="col">
                      {{ nomeVersao(versaoB) }}
                    </th>
                    <th scope="col">Situação</th>
                  </tr>
                </thead>

                <tbody>
                  <tr
                    v-for="linha in linhas"
                    :key="linha.id"
                    :class="{
                      'regras-comparacao-alterada': linha.diferente,
                    }"
                  >
                    <th scope="row">{{ linha.nome }}</th>

                    <td>
                      {{
                        formatarValor(
                          linha.parametroA,
                          linha.tipoA,
                          linha.unidadeA,
                        )
                      }}
                    </td>

                    <td>
                      {{
                        formatarValor(
                          linha.parametroB,
                          linha.tipoB,
                          linha.unidadeB,
                        )
                      }}
                    </td>

                    <td>{{ linha.situacao }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p
              v-else-if="parametrosDisponiveis"
              class="regras-aviso-consulta"
            >
              As versões selecionadas não possuem parâmetros.
            </p>

            <p
              v-if="parametrosDisponiveis && linhas.length"
              class="regras-texto-secundario"
              role="status"
            >
              {{ quantidadeDiferencas }}
              {{
                quantidadeDiferencas === 1
                  ? 'parâmetro diferente.'
                  : 'parâmetros diferentes.'
              }}
              As linhas destacadas indicam diferenças.
            </p>

            <h3 class="regras-secao-titulo">
              Métodos de cálculo
            </h3>

            <template v-if="formulasDisponiveis">
              <p
                :class="
                  formulasDiferentes
                    ? 'regras-aviso'
                    : 'regras-aviso-consulta'
                "
              >
                {{
                  formulasDiferentes
                    ? 'Os métodos de cálculo são diferentes.'
                    : 'Os métodos de cálculo são iguais.'
                }}
              </p>

              <strong>{{ nomeVersao(versaoA) }}</strong>

              <div class="regras-formula">
                {{ versaoA.formula }}
              </div>

              <p>
                <strong>{{ nomeVersao(versaoB) }}</strong>
              </p>

              <div class="regras-formula">
                {{ versaoB.formula }}
              </div>
            </template>

            <p v-else class="regras-texto-secundario">
              Os métodos de cálculo das duas versões não foram
              carregados.
            </p>
          </template>
        </template>

        <div class="regras-acoes">
          <RouterLink
            :to="{ name: 'Regras' }"
            class="regras-botao"
          >
            Fechar
          </RouterLink>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped src="../assets/css/regras.css"></style>
