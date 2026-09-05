import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      './apps/web/vite.config.ts',
      './packages/ui/vitest.config.ts',
      { test: { name: 'api', root: './apps/api', environment: 'node' } },
      // The workflow is pure functions over three tables, and its tests are the
      // ones that keep a fifth status honest — so `packages/shared` needed a
      // project of its own rather than having them exercised second-hand
      // through a route.
      { test: { name: 'shared', root: './packages/shared', environment: 'node' } },
      {
        test: {
          name: 'eslint-plugin-harness',
          root: './internal/eslint-plugin-harness',
          environment: 'node',
          include: ['src/**/*.test.js'],
        },
      },
      // The duplication check is the other harness tool with logic of its own,
      // and the one whose threshold is a number somebody chose. Its tests pin
      // both halves: that a copied-and-renamed file is found, and — measured, in
      // named pairs — what the threshold is set too high to see.
      {
        test: {
          name: 'duplication-check',
          root: './internal/duplication-check',
          environment: 'node',
          include: ['src/**/*.test.js'],
        },
      },
    ],
  },
})
