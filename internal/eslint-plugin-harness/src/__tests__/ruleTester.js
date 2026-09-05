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
import markdown from '@eslint/markdown'
import tsParser from '@typescript-eslint/parser'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
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

/**
 * A `RuleTester` for Markdown, through the language the config gives prose.
 *
 * The two document rules return visitors for a Markdown `root` as well as for a
 * TypeScript `Program`, and both halves are exercised: a rule that reads
 * docblocks and silently stops at the README is a rule that reports zero for the
 * four files it was mostly written for.
 */
export function createMarkdownRuleTester() {
  return new RuleTester({
    plugins: { markdown },
    language: 'markdown/commonmark',
  })
}

/**
 * The checkout this test file is in.
 *
 * The document rules resolve against the real repository — that is what they
 * are — so their cases are given real paths and synthetic contents, rather than
 * a fixture tree that would have to be kept in step with the real one to mean
 * anything.
 */
export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')

/** An absolute path to a real file in this checkout. */
export function repoFile(relative) {
  return path.join(REPO_ROOT, relative)
}

/** A path inside `apps/web/src/features`, where feature code lives. */
export function featureFile(name = 'tickets/TicketListPage.tsx') {
  return `/repo/apps/web/src/features/${name}`
}

/** A path inside `apps/web/src` but outside `features`: the app shell. */
export function appShellFile(name = 'app/AppLayout.tsx') {
  return `/repo/apps/web/src/${name}`
}

/** A path inside `packages/ui/src`, where the design system lives. */
export function uiFile(name = 'components/Modal/Modal.tsx') {
  return `/repo/packages/ui/src/${name}`
}
