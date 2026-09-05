import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** Kept in step with the port `apps/api/src/main.ts` defaults to. */
const API_PORT = 8787

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // The client only ever asks for `/api/...`, so it needs no base URL and no
    // environment variable: in development this proxy answers, and in
    // production the API is served from the same origin.
    proxy: {
      '/api': { target: `http://localhost:${String(API_PORT)}`, changeOrigin: true },
    },
  },
  test: {
    name: 'web',
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
