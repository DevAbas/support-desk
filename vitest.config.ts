import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      './apps/web/vite.config.ts',
      './packages/ui/vitest.config.ts',
      { test: { name: 'api', root: './apps/api', environment: 'node' } },
      {
        test: {
          name: 'eslint-plugin-harness',
          root: './internal/eslint-plugin-harness',
          environment: 'node',
          include: ['src/**/*.test.js'],
        },
      },
    ],
  },
})
