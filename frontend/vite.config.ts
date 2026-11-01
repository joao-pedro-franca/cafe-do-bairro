import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { cafeConfig } from './src/data/cafeConfig.ts'

const escaparHtml = (texto: string) => texto.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), {
    name: 'identidade-do-cafe',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.replaceAll('__CAFE_TITULO__', escaparHtml(cafeConfig.tituloPagina)).replaceAll('__CAFE_DESCRICAO__', escaparHtml(cafeConfig.apresentacao)),
    },
  }],
  server: {
    host: '127.0.0.1',
    proxy: {
      '/api': { target: 'http://127.0.0.1:3001' },
    },
  },
})
