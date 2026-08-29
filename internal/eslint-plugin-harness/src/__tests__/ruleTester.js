/**
 * A `RuleTester` wired to vitest and to the parser this repo actually uses.
 *
 * ESLint's `RuleTester` looks for `describe` and `it` on itself and falls back
 * to running every case inline in one block. vitest does not put them on the
 * global object unless `globals` is set, so they are handed over explicitly —
 * which also means a failing case is reported as the case that failed rather
 * than as one enormous assertion.
 */

import { RuleTester } from 'eslint'
import tsParser from '@typescript-eslint/parser'
import { afterAll, describe, it } from 'vitest'

RuleTester.afterAll = afterAll
RuleTester.describe = describe
RuleTester.it = it
RuleTester.itOnly = it.only

export function createRuleTester() {
  return new RuleTester({
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  })
}

/** A path inside `apps/web/src/features`, where feature code lives. */
export function featureFile(name = 'tickets/TicketListPage.tsx') {
  return `/repo/apps/web/src/features/${name}`
}

/** A path inside `packages/ui/src`, where the design system lives. */
export function uiFile(name = 'components/Modal/Modal.tsx') {
  return `/repo/packages/ui/src/${name}`
}
