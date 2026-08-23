import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** Kept in step with the port `server/main.ts` defaults to. */
const API_PORT = 8787

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // The client only ever asks for `/api/...`, so it needs no base URL and no
    // environment variable: in development this proxy answers, and in
    // production the API is served from the same origin.
    proxy: {
      '/api': { target: `http://localhost:${String(API_PORT)}`, changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
