import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import htmlPartials from './build/html-partials.js'

export default defineConfig({
  plugins: [htmlPartials(), tailwindcss()],
  server: { port: 5173, host: true },
})