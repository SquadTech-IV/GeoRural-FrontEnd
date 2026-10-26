<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  dadosPendentesValidos,
  validarConfirmacao,
  formatarValorParametro,
} from '../services/regraService'

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

const autor = ref('')
const motivo = ref('')
const tentouConfirmar = ref(false)

const dadosDisponiveis = computed(() =>
  dadosPendentesValidos(props.indicador, props.parametrosPendentes),
)
const erros = computed(() => validarConfirmacao(autor.value, motivo.value))
const erroAutor = computed(() => erros.value.autor)
const erroMotivo = computed(() => erros.value.motivo)

const podeConfirmar = computed(
  () => dadosDisponiveis.value && !erroAutor.value && !erroMotivo.value && !props.salvando,
)

function parametroOriginal(id) {
  return props.indicador?.parametros?.find((parametro) => parametro.id === id)
}

function formatarValor(valor, parametro) {
  return formatarValorParametro({ ...parametro, valor })
}

function confirmar() {
  tentouConfirmar.value = true

  if (!podeConfirmar.value) return

  emit('confirmar', {
    indicadorId: props.parametrosPendentes.indicadorId,
    versaoBase: props.parametrosPendentes.versaoBase,
    autor: autor.value.trim(),
    motivo: motivo.value.trim(),
    parametros: props.parametrosPendentes.parametros.map((parametro) => ({
      id: parametro.id,
      valor: parametro.valor,
    })),
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

        <h2 id="titulo-modal-salvar">Criar nova versão</h2>

        <template v-if="dadosDisponiveis">
          <p class="regras-texto-secundario">{{ indicador.codigo }} · {{ indicador.nome }}</p>

          <p class="regras-aviso-consulta">
            A confirmação cria uma nova versão. A nova regra passa a ser vigente imediatamente. Os
            valores anteriores permanecem preservados no histórico.
          </p>

          <h3 class="regras-secao-titulo">Revisão dos parâmetros</h3>

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
                <tr v-for="parametro in parametrosPendentes.parametros" :key="parametro.id">
                  <td>
                    {{ parametroOriginal(parametro.id)?.nome ?? parametro.id }}
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
                    {{ formatarValor(parametro.valor, parametroOriginal(parametro.id)) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <form novalidate @submit.prevent="confirmar">
            <div class="regras-campo">
              <label for="autor-versao"> Autor da alteração </label>

              <input
                id="autor-versao"
                v-model="autor"
                name="autor"
                type="text"
                required
                :disabled="salvando"
                :aria-invalid="tentouConfirmar && Boolean(erroAutor)"
                :aria-describedby="tentouConfirmar && erroAutor ? 'erro-autor-versao' : undefined"
              />

              <small v-if="tentouConfirmar && erroAutor" id="erro-autor-versao" class="regras-erro">
                {{ erroAutor }}
              </small>
            </div>

            <div class="regras-campo">
              <label for="motivo-alteracao"> Motivo da alteração </label>

              <textarea
                id="motivo-alteracao"
                v-model="motivo"
                name="motivo"
                rows="3"
                required
                :disabled="salvando"
                :aria-invalid="tentouConfirmar && Boolean(erroMotivo)"
                :aria-describedby="
                  tentouConfirmar && erroMotivo ? 'erro-motivo-alteracao' : undefined
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

            <p v-if="erro" class="regras-erro" role="alert">
              {{ erro }}
            </p>

            <p v-if="salvando" class="regras-texto-secundario" role="status">
              Salvando nova versão...
            </p>

            <div class="regras-acoes">
              <RouterLink v-if="!salvando" :to="{ name: 'Regras' }" class="regras-botao">
                Cancelar
              </RouterLink>

              <button
                type="submit"
                class="regras-botao regras-botao--principal"
                :disabled="salvando"
              >
                {{ salvando ? 'Salvando...' : 'Confirmar nova versão' }}
              </button>
            </div>
          </form>
        </template>

        <template v-else>
          <p class="regras-texto-secundario">
            Não há parâmetros disponíveis para criar uma versão. Selecione um indicador e edite seus
            parâmetros primeiro.
          </p>

          <div class="regras-acoes">
            <RouterLink :to="{ name: 'Regras' }" class="regras-botao">
              Voltar para regras
            </RouterLink>
          </div>
        </template>
      </section>
    </div>
  </Teleport>
</template>

<style scoped src="../assets/css/regras.css"></style>
