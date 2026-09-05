import { describe, expect, it } from 'vitest'
import {
  citedPathsIn,
  citedSymbolsIn,
  loadRepoIndex,
  locateWithin,
  resolutionRootsFor,
} from '../docIndex.js'
import { REPO_ROOT } from './ruleTester.js'

describe('what counts as a cited path', () => {
  const found = (text) => [...citedPathsIn(text)].map((hit) => hit.citedPath)

  it('needs a slash and an extension, because each half rules something out', () => {
    // Without the slash this matches `package.json` in a sentence about
    // packages; without the extension it matches `@support-desk/ui`, which is a
    // package and not a file.
    expect(found('see packages/ui/src/index.ts here')).toEqual(['packages/ui/src/index.ts'])
    expect(found('declared in package.json')).toEqual([])
    expect(found('imported from @support-desk/ui')).toEqual([])
    expect(found('the screens are under apps/web/src/features/')).toEqual([])
  })

  it('reads a path out of backticks, brackets and parentheses alike', () => {
    expect(found('`packages/ui/README.md`')).toEqual(['packages/ui/README.md'])
    expect(found('[label](packages/ui/README.md)')).toEqual(['packages/ui/README.md'])
    expect(found("'./src/index.ts'")).toEqual(['src/index.ts'])
  })

  it('leaves dependencies and URLs alone', () => {
    expect(found('node_modules/tailwind-merge/dist/index.js')).toEqual([])
    expect(found('https://example.com/a/b.html')).toEqual([])
  })
})

describe('what counts as a cited symbol', () => {
  const found = (text) => [...citedSymbolsIn(text)].map((hit) => hit.symbol)

  it('reads SCREAMING_SNAKE_CASE and nothing else', () => {
    expect(found('the table is `TICKET_STATUSES`')).toEqual(['TICKET_STATUSES'])
    expect(found('rendered by `SheetPanel`')).toEqual([])
    expect(found('call `useSheetPanel` first')).toEqual([])
  })

  it('needs the backticks, because they are what says "this is a name"', () => {
    // A convention, an acronym, a shell word: prose is full of capitals, and a
    // backtick is the only signal that one of them is a citation.
    expect(found('written in SCREAMING_SNAKE_CASE')).toEqual([])
  })

  it('takes the head off a property, an index and a call', () => {
    expect(found('`TICKET_STATUSES.length`')).toEqual(['TICKET_STATUSES'])
    expect(found('`TICKET_STATUSES[0]`')).toEqual(['TICKET_STATUSES'])
  })

  it('does not read a shell assignment as a name', () => {
    expect(found('run `API_LATENCY_MS=0 npm run dev`')).toEqual([])
  })
})

describe('where a cited path might be relative to', () => {
  const packageDirs = ['internal/eslint-plugin-harness', 'packages/ui', 'apps/web', '.']

  it('tries the file, its src, its package and the root, most specific first', () => {
    expect(resolutionRootsFor('packages/ui/src/components/Modal/Modal.tsx', packageDirs)).toEqual([
      'packages/ui/src/components/Modal',
      'packages/ui/src',
      'packages/ui',
      '.',
    ])
  })

  it('skips the src tier for a file that is not under one', () => {
    expect(resolutionRootsFor('README.md', packageDirs)).toEqual(['.'])
  })
})

describe('the index of this checkout', () => {
  const index = loadRepoIndex(REPO_ROOT)

  it('is built from what git tracks, so build output cannot vouch for prose', () => {
    expect(index.isEmpty).toBe(false)
    expect(index.trackedPaths.has('packages/shared/src/workflow.ts')).toBe(true)
    expect([...index.trackedPaths].some((entry) => entry.includes('/dist/'))).toBe(false)
    expect([...index.trackedPaths].some((entry) => entry.includes('node_modules'))).toBe(false)
  })

  it('holds the tables the instructions tell an agent to edit', () => {
    for (const name of ['TICKET_STATUSES', 'TICKET_STATUS_LABELS', 'NAVIGATION_TARGETS']) {
      expect(index.declaredNames.has(name)).toBe(true)
    }
  })

  it('leaves test files out, so a fixture cannot vouch for itself', () => {
    // The name below appears in this directory as a string, in the cases
    // asserting that it resolves nowhere. Were tests indexed, those cases would
    // start passing for the wrong reason.
    expect(index.declaredNames.has('TICKET_STATE_LABELS')).toBe(false)
  })

  it('reports nothing rather than throwing outside a checkout', () => {
    expect(loadRepoIndex(null).isEmpty).toBe(true)
  })
})

describe('locating a token inside a run of text', () => {
  it('counts lines from where the run starts and columns from zero', () => {
    expect(locateWithin('one\ntwo', 4, { line: 10, column: 2 })).toEqual({ line: 11, column: 0 })
    expect(locateWithin('one', 2, { line: 1, column: 0 })).toEqual({ line: 1, column: 2 })
  })
})
