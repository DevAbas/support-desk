/**
 * run — read the built stylesheet, read the source, and compare.
 *
 * Split from `cli.js` so the whole check is one function a test can call with a
 * synthetic tree and a synthetic stylesheet, rather than something only
 * exercisable by spawning a process and reading its output.
 *
 * Why it refuses to read a stale stylesheet
 * -----------------------------------------
 * This is the only check here that reads a build artifact, which means it is the
 * only one that can be handed an answer to a question nobody asked — last week's
 * CSS, against today's source. It would pass, and passing is the worst thing it
 * could do. So the artifact's timestamp is compared against the newest file that
 * feeds it, and an older one is a failure with the command to run, not a shrug.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import {
  RECORDED,
  SOURCE_FILE,
  SOURCE_PATHS,
  STYLESHEET_DIRECTORY,
  STYLESHEET_INPUTS,
} from './index.js'
import { danglingReferences, parseStylesheet } from './stylesheet.js'
import { scanSource } from './source.js'

/**
 * @typedef {object} Site
 * @property {string} file
 * @property {number} line
 * @property {number} column
 */

/**
 * @typedef {object} Finding
 * @property {string} class
 * @property {Site[]} sites
 */

/**
 * The tracked files under a set of pathspecs.
 *
 * `git ls-files` rather than a walk of the filesystem, and the difference is the
 * point. Tailwind's own scanner honours `.gitignore`; a check that did the same
 * would go blind in exactly the places Tailwind is blind, which is where the
 * defect lives. See `index.js`.
 *
 * @param {string} root
 * @param {string[]} pathspecs
 * @returns {string[]}
 */
export function trackedFiles(root, pathspecs) {
  return execFileSync('git', ['ls-files', '-z', ...pathspecs], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  })
    .split('\0')
    .filter((entry) => entry !== '')
}

/**
 * The stylesheet `vite build` last wrote, and whether anything has moved since.
 *
 * @param {string} root
 * @returns {{ file: string, mtime: number } | null}
 */
export function findStylesheet(root) {
  /** @type {{ file: string, mtime: number }[]} */
  const built = []

  let entries
  try {
    entries = readdirSync(path.join(root, STYLESHEET_DIRECTORY))
  } catch {
    return null
  }

  for (const entry of entries) {
    if (!entry.endsWith('.css')) continue

    const file = path.posix.join(STYLESHEET_DIRECTORY, entry)
    built.push({ file, mtime: statSync(path.join(root, file)).mtimeMs })
  }

  built.sort((left, right) => right.mtime - left.mtime)

  return built[0] ?? null
}

/**
 * The newest file the stylesheet is built from.
 *
 * @param {string} root
 * @returns {{ file: string, mtime: number } | null}
 */
export function newestInput(root) {
  /** @type {{ file: string, mtime: number } | null} */
  let newest = null

  for (const file of trackedFiles(root, STYLESHEET_INPUTS)) {
    let mtime
    try {
      mtime = statSync(path.join(root, file)).mtimeMs
    } catch {
      continue
    }

    if (newest === null || mtime > newest.mtime) newest = { file, mtime }
  }

  return newest
}

/**
 * Whether the stylesheet was built before the last thing that feeds it changed.
 *
 * Pulled out as a function of two timestamps so a test can state the case
 * directly rather than having to arrange a checkout with the mtimes in it.
 *
 * @param {{ file: string, mtime: number } | null} built
 * @param {{ file: string, mtime: number } | null} newest
 * @returns {{ built: string, newer: string } | null}
 */
export function staleness(built, newest) {
  if (built === null || newest === null) return null
  if (newest.mtime <= built.mtime) return null

  return { built: built.file, newer: newest.file }
}

/**
 * @typedef {object} Report
 * @property {string | null} stylesheet
 * @property {{ built: string, newer: string } | null} stale
 * @property {number} classes
 * @property {number} customProperties
 * @property {number} files
 * @property {number} classStrings
 * @property {Finding[]} found Classes with no rule, worst first.
 * @property {Finding[]} added Findings nothing has written down.
 * @property {readonly { class: string, where: string, reason: string }[]} resolved
 * @property {import('./stylesheet.js').VarReference[]} dangling
 * @property {Site[]} spliced
 * @property {Site[]} outside
 * @property {{ file: string, message: string }[]} unreadable
 */

/**
 * Everything the command prints, for one checkout.
 *
 * @param {string} root
 * @param {{ recorded?: readonly { class: string, where: string, reason: string }[] }} [options]
 * @returns {Report}
 */
export function run(root, options = {}) {
  const { recorded = RECORDED } = options

  const empty = {
    classes: 0,
    customProperties: 0,
    files: 0,
    classStrings: 0,
    found: [],
    added: [],
    resolved: [],
    dangling: [],
    spliced: [],
    outside: [],
    unreadable: [],
  }

  const built = findStylesheet(root)
  if (built === null) return { ...empty, stylesheet: null, stale: null }

  const stale = staleness(built, newestInput(root))
  if (stale !== null) return { ...empty, stylesheet: built.file, stale }

  const stylesheet = parseStylesheet(readFileSync(path.join(root, built.file), 'utf8'))
  const isKnownClass = (/** @type {string} */ name) => stylesheet.classes.has(name)

  /** @type {Map<string, Site[]>} */
  const found = new Map()
  /** @type {Site[]} */
  const spliced = []
  /** @type {Site[]} */
  const outside = []
  /** @type {{ file: string, message: string }[]} */
  const unreadable = []

  let files = 0
  let classStrings = 0

  for (const file of trackedFiles(root, SOURCE_PATHS)) {
    if (!SOURCE_FILE.test(file)) continue

    /** @type {import('./source.js').FileScan} */
    let scan
    try {
      scan = scanSource(readFileSync(path.join(root, file), 'utf8'), file, isKnownClass)
    } catch (error) {
      unreadable.push({ file, message: error instanceof Error ? error.message : String(error) })
      continue
    }

    files += 1
    classStrings += scan.classStrings

    for (const token of scan.tokens) {
      if (stylesheet.classes.has(token.name)) continue

      const sites = found.get(token.name) ?? []
      sites.push({ file, line: token.line, column: token.column })
      found.set(token.name, sites)
    }

    for (const fragment of scan.spliced) {
      spliced.push({ file, line: fragment.line, column: fragment.column })
    }

    for (const literal of scan.outside) {
      outside.push({ file, line: literal.line, column: literal.column })
    }
  }

  const findings = [...found.entries()]
    .map(([name, sites]) => ({ class: name, sites: sites.sort(bySite) }))
    .sort((left, right) => right.sites.length - left.sites.length || left.class.localeCompare(right.class))

  const { added, resolved } = reconcile(findings, recorded)

  return {
    stylesheet: built.file,
    stale: null,
    classes: stylesheet.classes.size,
    customProperties: stylesheet.customProperties.size,
    files,
    classStrings,
    found: findings,
    added,
    resolved,
    dangling: danglingReferences(stylesheet),
    spliced,
    outside,
    unreadable,
  }
}

/**
 * The findings nothing has written down, and the entries that no longer hold.
 *
 * Both directions fail the check, the way `internal/duplication-check` does it:
 * an unrecorded finding because somebody has to argue for it, and a recorded one
 * that resolves again because a stale entry is a claim nobody has re-read.
 * Deleting it is the one line in a diff that says the class came back.
 *
 * @param {Finding[]} findings
 * @param {readonly { class: string, where: string, reason: string }[]} recorded
 * @returns {{ added: Finding[], resolved: readonly { class: string, where: string, reason: string }[] }}
 */
export function reconcile(findings, recorded) {
  const recordedKeys = new Set(recorded.map(keyOf))
  const foundKeys = new Set(
    findings.flatMap((finding) =>
      finding.sites.map((site) => keyOf({ class: finding.class, where: site.file })),
    ),
  )

  const added = findings
    .map((finding) => ({
      class: finding.class,
      sites: finding.sites.filter(
        (site) => !recordedKeys.has(keyOf({ class: finding.class, where: site.file })),
      ),
    }))
    .filter((finding) => finding.sites.length > 0)

  return { added, resolved: recorded.filter((entry) => !foundKeys.has(keyOf(entry))) }
}

/**
 * A recorded entry covers one class in one file, so that recording the four
 * sites of a class in one component does not silently cover a fifth somewhere
 * else.
 *
 * @param {{ class: string, where: string }} entry
 * @returns {string}
 */
export function keyOf({ class: name, where }) {
  return `${name} ${where}`
}

/**
 * @param {Site} left
 * @param {Site} right
 * @returns {number}
 */
function bySite(left, right) {
  return left.file.localeCompare(right.file) || left.line - right.line || left.column - right.column
}
