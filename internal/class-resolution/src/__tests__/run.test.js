import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { findStylesheet, keyOf, reconcile, run, staleness } from '../run.js'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')

/**
 * @param {string} file
 * @param {number} mtime
 */
const stamp = (file, mtime) => ({ file, mtime })

describe('refusing to read a stylesheet older than the source', () => {
  // This is the only check here whose subject is a build artifact, which makes
  // it the only one that can be handed a confident answer to a question nobody
  // asked. Passing on last week's CSS is the worst thing it could do, so an
  // artifact older than its inputs is a failure rather than a shrug.
  it('is quiet when the build came after the last edit', () => {
    expect(staleness(stamp('dist/a.css', 200), stamp('src/x.tsx', 100))).toBeNull()
  })

  it('is quiet when they are the same moment, which a fast build makes common', () => {
    expect(staleness(stamp('dist/a.css', 100), stamp('src/x.tsx', 100))).toBeNull()
  })

  it('names both files when the source moved after the build', () => {
    expect(staleness(stamp('dist/a.css', 100), stamp('src/x.tsx', 200))).toEqual({
      built: 'dist/a.css',
      newer: 'src/x.tsx',
    })
  })

  it('has nothing to say when there is no build, which is a different message', () => {
    expect(staleness(null, stamp('src/x.tsx', 200))).toBeNull()
  })
})

describe('finding the built stylesheet', () => {
  // Over a directory the test builds rather than over `apps/web/dist`, which is
  // gitignored: the suite has to mean the same thing on a fresh clone that has
  // never run a build as it does here.
  const root = mkdtempSync(path.join(tmpdir(), 'class-resolution-'))
  const assets = path.join(root, 'apps/web/dist/assets')

  mkdirSync(assets, { recursive: true })
  writeFileSync(path.join(assets, 'index-old.css'), '.a{color:red}')
  writeFileSync(path.join(assets, 'index-new.css'), '.b{color:red}')
  utimesSync(path.join(assets, 'index-old.css'), new Date(1000), new Date(1000))
  utimesSync(path.join(assets, 'index-new.css'), new Date(2000), new Date(2000))

  it('takes the newest, because Vite hashes the name and leaves the old one behind', () => {
    expect(findStylesheet(root)?.file).toBe('apps/web/dist/assets/index-new.css')
  })

  it('reports a path relative to the root, which is what the report prints', () => {
    expect(findStylesheet(root)?.file.startsWith('apps/')).toBe(true)
  })

  it('returns nothing where nothing has been built', () => {
    expect(findStylesheet(path.join(REPO_ROOT, 'internal'))).toBeNull()
  })
})

describe('a checkout with no build in it', () => {
  // The report has to say which of the two it is, because the reader's next
  // move differs: build, or look at what the build produced.
  const report = run(path.join(REPO_ROOT, 'internal'))

  it('says there is no stylesheet rather than that there is nothing wrong', () => {
    expect(report.stylesheet).toBeNull()
    expect(report.stale).toBeNull()
  })

  it('claims to have read nothing, so a caller cannot mistake it for a clean run', () => {
    expect(report.files).toBe(0)
    expect(report.classStrings).toBe(0)
    expect(report.found).toEqual([])
  })
})

describe('the ledger', () => {
  const finding = {
    class: 'rounded-element',
    sites: [
      { file: 'packages/ui/src/components/Alert/Alert.tsx', line: 24, column: 12 },
      { file: 'packages/ui/src/primitives/Button/Button.tsx', line: 5, column: 3 },
    ],
  }

  const entry = {
    class: 'rounded-element',
    where: 'packages/ui/src/components/Alert/Alert.tsx',
    reason: 'a reason that is an argument',
  }

  it('keys an entry to one class in one file', () => {
    expect(keyOf(entry)).toBe('rounded-element packages/ui/src/components/Alert/Alert.tsx')
  })

  it('fails on a finding nothing has written down', () => {
    expect(reconcile([finding], []).added).toEqual([finding])
  })

  it('covers only the file it names, so a second site is still a finding', () => {
    // A recorded entry is an argument about one call site. Letting it cover
    // every other use of the same class is how a ledger stops being a ratchet.
    const { added } = reconcile([finding], [entry])

    expect(added).toEqual([
      { class: 'rounded-element', sites: [finding.sites[1]] },
    ])
  })

  it('fails on an entry for a class that resolves again', () => {
    expect(reconcile([], [entry]).resolved).toEqual([entry])
  })

  it('is quiet when the ledger and the findings agree', () => {
    const both = reconcile([{ class: 'rounded-element', sites: [finding.sites[0]] }], [entry])

    expect(both).toEqual({ added: [], resolved: [] })
  })
})
