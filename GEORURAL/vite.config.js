import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), '')
  const proxy = {
    '/api': {
      target: env.BACKEND_URL || 'http://localhost:8080',
      changeOrigin: true,
    },
    '/auth': {
      target: env.AUTH_SERVER_URL || 'http://localhost:8180',
      changeOrigin: true,
      rewrite: path => path.replace(/^\/auth/, ''),
    },
  }

  return {
    server: {
      port: 5173,
      strictPort: true,
      proxy,
    },
    preview: { proxy },
    plugins: [vue(), vueDevTools()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
