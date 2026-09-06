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
      // The class-resolution sensor is the third harness tool with logic of its
      // own, and the only one whose subject is a build artifact. Its tests are
      // over fixtures rather than over `apps/web/dist`, deliberately: the suite
      // has to pass on a fresh clone that has never run a build, and the check
      // over this checkout is `npm run lint:classes` in CI. What they pin is the
      // half a fixture cannot reach — that the extractor still finds every one
      // of the fourteen `rounded-element` sites in the real tree.
      {
        test: {
          name: 'class-resolution',
          root: './internal/class-resolution',
          environment: 'node',
          include: ['src/**/*.test.js'],
        },
      },
    ],
  },
})
