#!/usr/bin/env node
/**
 * The command. `npm run lint:duplication`.
 *
 * Prints what is over the line, marks what is recorded, and fails on anything
 * that is not — or on anything recorded that is no longer there. The message
 * ends the way the lint rules' messages do: by saying that changing the number
 * is a fair answer, because a threshold argued in a diff is a threshold somebody
 * reviewed.
 */

import process from 'node:process'
import { MIN_SHARE, RECORDED, WINDOW } from './index.js'
import { keyOf, run } from './run.js'

const root = process.cwd()
const { found, added, resolved, unreadable, files } = run(root)
const recordedByKey = new Map(RECORDED.map((entry) => [keyOf(entry), entry]))

const share = (pair) => `${String(Math.round(pair.share * 100)).padStart(3)}%`
const lines = (range) => (range === null ? '' : `:${String(range.from)}-${String(range.to)}`)

console.log(
  `duplication-check: ${String(files)} files, shape windows of ${String(WINDOW)} nodes, ` +
    `reporting a pair sharing ${String(Math.round(MIN_SHARE * 100))}% or more of the smaller file.\n`,
)

for (const pair of found) {
  const entry = recordedByKey.get(keyOf(pair))
  const tag = entry === undefined ? 'NEW      ' : `${entry.kind.padEnd(9)}`

  console.log(`${tag} ${share(pair)}  ${pair.left}${lines(pair.leftLines)}`)
  console.log(`${' '.repeat(15)}${pair.right}${lines(pair.rightLines)}`)

  if (entry !== undefined) console.log(`${' '.repeat(15)}${entry.reason}`)

  console.log('')
}

for (const entry of resolved) {
  console.log(`GONE      ${entry.left}\n${' '.repeat(10)}${entry.right}`)
  console.log(`${' '.repeat(10)}no longer over the line — delete this entry from src/index.js\n`)
}

for (const entry of unreadable) {
  console.log(`unreadable: ${entry.path} — ${entry.message}`)
}

const duplication = found.filter((pair) => recordedByKey.get(keyOf(pair))?.kind === 'duplication')

console.log(
  `${String(found.length)} over the line: ${String(added.length)} not recorded, ` +
    `${String(duplication.length)} recorded as duplication still to collapse, ` +
    `${String(resolved.length)} recorded and gone.`,
)

if (added.length > 0 || resolved.length > 0) {
  console.log(
    '\nEvery pair over the line has to be written down in ' +
      'internal/duplication-check/src/index.js with the reason it is there, and every entry has ' +
      'to still be true. Raising MIN_SHARE is a fair answer and shows up in the diff, where a ' +
      'silently unrecorded pair does not.',
  )
  process.exit(1)
}

if (unreadable.length > 0) process.exit(1)
