/**
 * run — collect the files, measure them, and compare against what is recorded.
 *
 * Split from `cli.js` so the whole check is one pure-ish function a test can
 * call with a synthetic tree, rather than something only exercisable by spawning
 * a process and reading its output.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { findClonePairs } from './detector.js'
import { IGNORED, MIN_SHARE, RECORDED, WINDOW } from './index.js'
import { shapeOf } from './shape.js'

/** The files a copy could have been made of: source, not tests and not barrels. */
export function collectFiles(root) {
  const tracked = execFileSync('git', ['ls-files', '-z', 'apps', 'packages'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  })
    .split('\0')
    .filter((entry) => entry !== '' && /\.tsx?$/.test(entry))
    .filter((entry) => !IGNORED.some((pattern) => pattern.test(entry)))

  const files = []
  const unreadable = []

  for (const entry of tracked) {
    try {
      files.push({ path: entry, ...shapeOf(readFileSync(path.join(root, entry), 'utf8'), entry) })
    } catch (error) {
      unreadable.push({ path: entry, message: error.message })
    }
  }

  return { files, unreadable }
}

/**
 * `{ found, added, resolved, unreadable }` for a checkout.
 *
 * `added` is a pair over the line that nothing has written down: the check
 * fails. `resolved` is a recorded pair that is no longer over the line: the
 * check also fails, because a stale entry is a claim nobody has re-read, and
 * deleting it is the one line in a diff that says the copy is gone.
 */
export function run(root, options = {}) {
  const { window = WINDOW, minShare = MIN_SHARE, recorded = RECORDED } = options
  const { files, unreadable } = collectFiles(root)
  const found = findClonePairs(files, { window, minShare })

  const foundKeys = new Set(found.map(keyOf))
  const recordedByKey = new Map(recorded.map((entry) => [keyOf(entry), entry]))

  const added = found.filter((pair) => !recordedByKey.has(keyOf(pair)))
  const resolved = recorded.filter((entry) => !foundKeys.has(keyOf(entry)))

  return { found, added, resolved, unreadable, files: files.length }
}

/** A pair is unordered; the key sorts it so a recorded entry matches either way. */
export function keyOf({ left, right }) {
  return [left, right].sort().join(' + ')
}
