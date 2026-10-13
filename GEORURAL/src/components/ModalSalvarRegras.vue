<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps({
  parametrosPendentes: {
    type: Object,
    default: null,
  },
  indicador: {
    type: Object,
    default: null,
  },
  salvando: {
    type: Boolean,
    default: false,
  },
  erro: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['confirmar'])

const inicioVigencia = ref('')
const motivo = ref('')
const tentouConfirmar = ref(false)

function dataValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false

  const [ano, mes, dia] = valor.split('-').map(Number)
  const data = new Date(0)

  data.setUTCHours(0, 0, 0, 0)
  data.setUTCFullYear(ano, mes - 1, dia)

  return (
    data.getUTCFullYear() === ano &&
    data.getUTCMonth() === mes - 1 &&
    data.getUTCDate() === dia
  )
}

const dadosDisponiveis = computed(() =>
  Boolean(
    props.indicador &&
    props.parametrosPendentes?.indicadorId === props.indicador.id &&
    Array.isArray(props.parametrosPendentes?.parametros) &&
    props.parametrosPendentes.parametros.length > 0,
  ),
)

const erroVigencia = computed(() => {
  if (!inicioVigencia.value) {
    return 'Informe o início da vigência.'
  }

  if (!dataValida(inicioVigencia.value)) {
    return 'Informe uma data válida.'
  }

  return ''
})

const erroMotivo = computed(() =>
  motivo.value.trim()
    ? ''
    : 'Informe o motivo da alteração.',
)

const podeConfirmar = computed(() =>
  dadosDisponiveis.value &&
  !erroVigencia.value &&
  !erroMotivo.value &&
  !props.salvando,
)

function parametroOriginal(id) {
  return props.indicador?.parametros?.find(
    (parametro) => parametro.id === id,
  )
}

function formatarValor(valor, parametro) {
  if (valor == null || valor === '') return '—'

  if (parametro?.tipo === 'data') {
    const texto = String(valor)

    if (!dataValida(texto)) return texto

    const [ano, mes, dia] = texto.split('-')
    return `${dia}/${mes}/${ano}`
  }

  const numero = Number(valor)
  const texto = Number.isFinite(numero)
    ? numero.toLocaleString('pt-BR')
    : String(valor)

  return `${texto}${parametro?.unidade ? ` ${parametro.unidade}` : ''}`
}

function confirmar() {
  tentouConfirmar.value = true

  if (!podeConfirmar.value) return

  emit('confirmar', {
    indicadorId: props.parametrosPendentes.indicadorId,
    versaoBase: props.indicador.versaoVigente ?? null,
    inicioVigencia: inicioVigencia.value,
    motivo: motivo.value.trim(),
    parametros: props.parametrosPendentes.parametros.map(
      (parametro) => ({
        id: parametro.id,
        valor: parametro.valor,
      }),
    ),
  })
}
</script>

<template>
  <Teleport to="body">
    <div class="regras-overlay">
      <section
        class="regras-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-modal-salvar"
        :aria-busy="salvando"
      >
        <RouterLink
          v-if="!salvando"
          :to="{ name: 'Regras' }"
          class="regras-modal-fechar"
          aria-label="Fechar"
        >
          ×
        </RouterLink>

        <h2 id="titulo-modal-salvar">
          Criar nova versão
        </h2>

        <template v-if="dadosDisponiveis">
          <p class="regras-texto-secundario">
            {{ indicador.codigo }} · {{ indicador.nome }}
          </p>

          <p class="regras-aviso-consulta">
            A confirmação cria uma nova versão.
            Os valores das versões anteriores devem permanecer
            preservados no histórico.
          </p>

          <h3 class="regras-secao-titulo">
            Revisão dos parâmetros
          </h3>

          <div class="regras-tabela-container">
            <table class="regras-tabela">
              <thead>
                <tr>
                  <th scope="col">Parâmetro</th>
                  <th scope="col">Valor atual</th>
                  <th scope="col">Novo valor</th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="parametro in parametrosPendentes.parametros"
                  :key="parametro.id"
                >
                  <td>
                    {{
                      parametroOriginal(parametro.id)?.nome ??
                      parametro.id
                    }}
                  </td>

                  <td>
                    {{
                      formatarValor(
                        parametroOriginal(parametro.id)?.valor,
                        parametroOriginal(parametro.id),
                      )
                    }}
                  </td>

                  <td>
                    {{
                      formatarValor(
                        parametro.valor,
                        parametroOriginal(parametro.id),
                      )
                    }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <form
            novalidate
            @submit.prevent="confirmar"
          >
            <div class="regras-campo">
              <label for="inicio-vigencia">
                Início da vigência
              </label>

              <input
                id="inicio-vigencia"
                v-model="inicioVigencia"
                name="inicioVigencia"
                type="date"
                required
                :disabled="salvando"
                :aria-invalid="
                  tentouConfirmar && Boolean(erroVigencia)
                "
                :aria-describedby="
                  tentouConfirmar && erroVigencia
                    ? 'erro-inicio-vigencia'
                    : undefined
                "
              />

              <small
                v-if="tentouConfirmar && erroVigencia"
                id="erro-inicio-vigencia"
                class="regras-erro"
              >
                {{ erroVigencia }}
              </small>
            </div>

            <div class="regras-campo">
              <label for="motivo-alteracao">
                Motivo da alteração
              </label>

              <textarea
                id="motivo-alteracao"
                v-model="motivo"
                name="motivo"
                rows="3"
                required
                :disabled="salvando"
                :aria-invalid="
                  tentouConfirmar && Boolean(erroMotivo)
                "
                :aria-describedby="
                  tentouConfirmar && erroMotivo
                    ? 'erro-motivo-alteracao'
                    : undefined
                "
                placeholder="Informe o motivo da alteração."
              ></textarea>

              <small
                v-if="tentouConfirmar && erroMotivo"
                id="erro-motivo-alteracao"
                class="regras-erro"
              >
                {{ erroMotivo }}
              </small>
            </div>

            <p
              v-if="erro"
              class="regras-erro"
              role="alert"
            >
              {{ erro }}
            </p>

            <p
              v-if="salvando"
              class="regras-texto-secundario"
              role="status"
            >
              Salvando nova versão...
            </p>

            <div class="regras-acoes">
              <RouterLink
                v-if="!salvando"
                :to="{ name: 'Regras' }"
                class="regras-botao"
              >
                Cancelar
              </RouterLink>

              <button
                type="submit"
                class="regras-botao regras-botao--principal"
                :disabled="salvando"
              >
                {{
                  salvando
                    ? 'Salvando...'
                    : 'Confirmar nova versão'
                }}
              </button>
            </div>
          </form>
        </template>

        <template v-else>
          <p class="regras-texto-secundario">
            Não há parâmetros disponíveis para criar uma versão.
            Selecione um indicador e edite seus parâmetros primeiro.
          </p>

          <div class="regras-acoes">
            <RouterLink
              :to="{ name: 'Regras' }"
              class="regras-botao"
            >
              Voltar para regras
            </RouterLink>
          </div>
        </template>
      </section>
    </div>
  </Teleport>
</template>

<style scoped src="../assets/css/regras.css"></style>
