/**
 * docIndex — the two things a sentence about this codebase can be checked against.
 *
 * Why this file exists
 * --------------------
 * Prose that contradicts the code beside it is the largest recurring category of
 * defect in this repository, and it is the only one with no sensor at all. The
 * root README still described a `src/design-system/` and a `src/lib/` that the
 * move to workspaces had already renamed; `apps/web/vite.config.ts` still said
 * its port was kept in step with a file under the `server/` directory that the
 * same move turned into `apps/api/`. Both read exactly like sentences that are
 * true. Nothing parses a comment, so nothing noticed.
 *
 * Most of that category is unprovable. "A glance should not be a history entry"
 * is a claim about behaviour, and no tool is going to check it. What *is*
 * checkable is the narrow slice that is a **reference**: a file path, or the name
 * of a symbol. A reference either resolves against this repository or it does
 * not, and when it does not, the sentence around it has almost always gone stale
 * with it.
 *
 * So this module holds the index, and the two rules that read it hold the
 * judgement about what is worth citing. Everything here is pure except
 * `loadRepoIndex`, which is the one piece that touches the disk and is cached per
 * repository root, because a lint run over 300 files must not scan the tree 300
 * times.
 *
 * Why the index is built from `git ls-files`
 * ------------------------------------------
 * The alternative is a glob, and a glob has to be told about `node_modules`,
 * `dist`, `coverage` and every future build directory. Git already knows, and
 * knows from `.gitignore` rather than from a second list that will drift from it.
 *
 * `--others --exclude-standard` is on for a reason worth stating: without it the
 * index is what has been *committed*, and a file written five minutes ago does
 * not exist yet. That turns the rules into something that reports a correct
 * citation as stale until it is staged, which is the one behaviour guaranteed to
 * get a sensor switched off. With it, the index is every file a reader could
 * open that git has not been told to ignore.
 *
 * It also fails recoverably: outside a checkout there is no index at all, and
 * the rules that read it become no-ops rather than crashing a lint run.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

/** One index per repository root, built on first use and kept for the process. */
const INDEXES = new Map()

/**
 * The checkout `filePath` sits in, or `null` when it is not in one.
 *
 * Walked from the file rather than taken from `context.cwd`, because ESLint's
 * cwd is wherever it was invoked and a rule has to work when it was invoked from
 * a workspace directory.
 */
export function findRepoRoot(filePath) {
  let current = path.dirname(path.resolve(filePath))

  for (;;) {
    if (existsSync(path.join(current, '.git'))) return current

    const parent = path.dirname(current)

    if (parent === current) return null

    current = parent
  }
}

/**
 * `{ trackedPaths, packageDirs, declaredNames }` for a checkout.
 *
 * `trackedPaths` is every file git knows about, repo-relative. `packageDirs` is
 * every directory holding a `package.json`, longest first, so the nearest one to
 * a file is the first that matches. `declaredNames` is every identifier that
 * appears in code, with two things left out.
 *
 * **Comments**, because a name that survives only in a second comment must not
 * be what vouches for the first — that is a rename leaving two stale sentences
 * agreeing with each other.
 *
 * **Test files**, for the sharper version of the same problem. A test fixture is
 * a string, not a declaration, and a string is exactly what a rule's own test
 * cases are made of: a case asserting that some removed table no longer resolves
 * would put that very name into the index, and the case would start passing for
 * the wrong reason. Nothing is lost by the exclusion — anything a test uses is
 * declared in the source it imports.
 */
export function loadRepoIndex(root) {
  if (root === null) return EMPTY_INDEX

  const cached = INDEXES.get(root)

  if (cached !== undefined) return cached

  const index = buildRepoIndex(root)

  INDEXES.set(root, index)

  return index
}

const EMPTY_INDEX = {
  trackedPaths: new Set(),
  packageDirs: [],
  declaredNames: new Set(),
  isEmpty: true,
}

function buildRepoIndex(root) {
  let tracked

  try {
    tracked = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    })
      .split('\0')
      .filter((entry) => entry !== '')
  } catch {
    // No git, a bare directory, a submodule mid-checkout. A sensor that cannot
    // read the repository reports nothing; it does not fail the lint run.
    return EMPTY_INDEX
  }

  const trackedPaths = new Set(tracked)
  const packageDirs = tracked
    .filter((entry) => path.basename(entry) === 'package.json')
    .map((entry) => path.dirname(entry))
    .sort((a, b) => b.length - a.length)

  const declaredNames = new Set()

  for (const entry of tracked) {
    if (!/\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(entry)) continue
    if (IS_TEST.test(entry)) continue

    let source

    try {
      source = readFileSync(path.join(root, entry), 'utf8')
    } catch {
      continue
    }

    for (const name of withoutComments(source).match(IDENTIFIER) ?? []) {
      declaredNames.add(name)
    }
  }

  return { trackedPaths, packageDirs, declaredNames, isEmpty: false }
}

const IDENTIFIER = /\b[A-Za-z_$][\w$]*\b/g

/** A test's fixtures are strings about the code, not declarations in it. */
const IS_TEST = /(?:^|\/)__tests__\/|\.test\.[cm]?[jt]sx?$/

/** Comments removed, so a name kept alive only by prose does not vouch for prose. */
function withoutComments(source) {
  return source.replaceAll(/\/\*[\s\S]*?\*\//g, ' ').replaceAll(/\/\/[^\n]*/g, ' ')
}

/**
 * Where a path written in `filePath` might be relative to, most specific first.
 *
 * Prose does not write repo-relative paths and never has. `packages/ui/README.md`
 * says `primitives/Avatar/Avatar.tsx`, meaning relative to its own `src`;
 * `internal/eslint-plugin-harness/README.md` says `src/index.js`, meaning
 * relative to its own package. Insisting on one form would turn a documentation
 * convention into a hundred violations, so every form a reader would follow is
 * tried.
 */
export function resolutionRootsFor(relativeFilePath, packageDirs) {
  const roots = [path.dirname(relativeFilePath)]
  const srcAt = relativeFilePath.indexOf('/src/')

  if (srcAt !== -1) roots.push(relativeFilePath.slice(0, srcAt + '/src'.length))

  const nearestPackage = packageDirs.find(
    (dir) => relativeFilePath === dir || relativeFilePath.startsWith(`${dir}/`),
  )

  if (nearestPackage !== undefined) roots.push(nearestPackage)

  roots.push('.')

  return [...new Set(roots)]
}

/**
 * Whether a cited path resolves to a file in this repository.
 *
 * The last tier is a suffix match against the whole tracked list, which is
 * deliberately generous: `packages/ui/README.md` citing `components/Table/Table.tsx`
 * is unambiguous to a reader even though it is relative to nothing in particular.
 * What survives all five tiers names no file in the repository at all, which is
 * the only claim this rule makes.
 */
export function citedPathResolves(citedPath, roots, index) {
  for (const root of roots) {
    if (index.trackedPaths.has(normalise(path.posix.join(root, citedPath)))) return true
  }

  for (const tracked of index.trackedPaths) {
    if (tracked === citedPath || tracked.endsWith(`/${citedPath}`)) return true
  }

  return false
}

function normalise(joined) {
  return joined.startsWith('./') ? joined.slice(2) : joined
}

/**
 * Every path-shaped token in `text`, with the offset it sits at.
 *
 * Path-shaped means at least one slash and a file extension. Both halves matter:
 * without the slash this matches `package.json` in a sentence about packages,
 * and without the extension it matches `@support-desk/ui`, which is a package
 * name and not a file.
 */
export function* citedPathsIn(text) {
  for (const match of text.matchAll(CITED_PATH)) {
    const citedPath = match[1].replace(/^\.\//, '')

    if (IGNORED_PATH.test(citedPath)) continue

    yield { citedPath, index: match.index + match[0].length - match[1].length }
  }
}

const CITED_PATH =
  /(?:^|[\s`'"([<])((?:\.{0,2}\/)?[A-Za-z0-9_@.-]+(?:\/[A-Za-z0-9_@.-]+)+\.[A-Za-z0-9]{1,5})/g

/** Dependencies and URLs are not this repository's files. */
const IGNORED_PATH = /^(?:node_modules\/|https?:|www\.)/

/**
 * Every backticked SCREAMING_SNAKE_CASE token in `text`, with its offset.
 *
 * The shape restriction is the entire design of the symbol rule, and the
 * measurements behind it are in the README: on this repository the wider shapes
 * are unusable. `PascalCase` produces thirty unresolved tokens and every one is a
 * false positive — `Map`, `Date`, `Cmd`, `MemoryRouter`, `AbortSignal` — because
 * prose cites the platform and the libraries as readily as it cites this code,
 * and because a string literal's *value* is often capitalised too. `camelCase`
 * produces seventy-one, for the same reasons plus every option key of every
 * third-party hook.
 *
 * SCREAMING_SNAKE_CASE is the shape this codebase reserves for its own lookup
 * tables — `TICKET_STATUSES`, `NAVIGATION_TARGETS`, `TICKET_STATUS_LABELS` — and
 * those tables are precisely what AGENTS.md and both READMEs tell a reader to go
 * and edit. Twenty-five are cited today and all twenty-five resolve.
 */
export function* citedSymbolsIn(text) {
  for (const match of text.matchAll(BACKTICKED)) {
    const symbol = headOf(match[1].trim())

    if (!SCREAMING_SNAKE_CASE.test(symbol)) continue

    yield { symbol, index: match.index + 1 }
  }
}

const BACKTICKED = /`([^`\n]{2,80})`/g

const SCREAMING_SNAKE_CASE = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/

/** `TICKET_STATUSES.length` and `TICKET_STATUSES[0]` both cite `TICKET_STATUSES`. */
function headOf(token) {
  return token.split(/[.[(<]/)[0]
}

/**
 * The position of `offset` within a run of text, given where that run starts.
 *
 * ESLint locations are one-based lines and zero-based columns, and a comment or
 * a Markdown document is reported against the position of the token inside it
 * rather than the position of the whole thing — a README reported at line 1 is a
 * README nobody can act on.
 */
export function locateWithin(text, offset, start) {
  let line = start.line
  let column = start.column

  for (let at = 0; at < offset; at += 1) {
    if (text[at] === '\n') {
      line += 1
      column = 0
    } else {
      column += 1
    }
  }

  return { line, column }
}
