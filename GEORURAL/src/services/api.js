import axios from 'axios'
import { autenticacaoService } from './autenticacaoService'
import { configurarSegurancaHttp } from './segurancaHttpService'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/',
  timeout: 30000,
})

configurarSegurancaHttp(api, autenticacaoService)

export default api
