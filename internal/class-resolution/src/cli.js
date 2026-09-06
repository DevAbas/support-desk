#!/usr/bin/env node
/**
 * The command. `npm run lint:classes`.
 *
 * Prints every class the source writes that the built stylesheet cannot produce,
 * every `var()` in that stylesheet that reads a property nothing defines, and —
 * beside them, on every run — the two numbers that say how much it could not
 * look at. A sensor that reports only what it found reads as covering
 * everything.
 *
 * Exit codes: 0 is clean, 1 is anything to act on, including a stylesheet that
 * is missing or older than the source it was built from. 2 belongs to
 * `.claude/hooks/check-file.mjs` and this does not run there — it needs a build,
 * which is minutes past that budget. README.md says where each check runs.
 */

import process from 'node:process'
import { RECORDED } from './index.js'
import { keyOf, run } from './run.js'

const root = process.cwd()
const report = run(root)

if (report.stylesheet === null) {
  console.log(
    'class-resolution: no built stylesheet under apps/web/dist/assets.\n\n' +
      'This check reads the CSS that shipped rather than the CSS that should have. Run ' +
      '`npm run build` first.',
  )
  process.exit(1)
}

if (report.stale !== null) {
  console.log(
    `class-resolution: ${report.stale.built} is older than ${report.stale.newer}.\n\n` +
      'Reading it would answer a question about a checkout that no longer exists. Run ' +
      '`npm run build` first.',
  )
  process.exit(1)
}

const recordedByKey = new Map(RECORDED.map((entry) => [keyOf(entry), entry]))

console.log(
  `class-resolution: ${String(report.files)} files, ${String(report.classStrings)} class strings, ` +
    `against ${String(report.classes)} classes and ${String(report.customProperties)} custom ` +
    `properties in ${report.stylesheet}.\n`,
)

for (const finding of report.found) {
  const reasons = finding.sites
    .map((site) => recordedByKey.get(keyOf({ class: finding.class, where: site.file }))?.reason)
    .filter((reason) => reason !== undefined)

  const tag = reasons.length === finding.sites.length ? 'RECORDED' : 'NO RULE '

  console.log(`${tag}  ${finding.class}`)

  for (const site of finding.sites) {
    console.log(`${' '.repeat(10)}${site.file}:${String(site.line)}:${String(site.column)}`)
  }

  for (const reason of new Set(reasons)) console.log(`${' '.repeat(10)}${reason}`)

  console.log('')
}

for (const entry of report.dangling) {
  console.log(`NO VALUE  ${entry.reference}`)
  console.log(`${' '.repeat(10)}read by ${entry.property} in ${entry.owner}, defined nowhere\n`)
}

for (const entry of report.resolved) {
  console.log(`GONE      ${entry.class} in ${entry.where}`)
  console.log(`${' '.repeat(10)}resolves again — delete this entry from src/index.js\n`)
}

for (const entry of report.unreadable) {
  console.log(`unreadable: ${entry.file} — ${entry.message}`)
}

// The two blind spots, measured rather than described. `spliced` is a class the
// source builds out of an expression, which has no whole token to look up.
// `outside` is a class string written somewhere none of the position rules in
// src/source.js reach — the number that says the day the `*Classes` convention
// stops holding, rather than the coverage dropping quietly.
console.log(
  `${plural(report.spliced.length, 'class fragment is', 'class fragments are')} spliced with an ` +
    `expression and cannot be read. ` +
    `${plural(report.outside.length, 'class string sits', 'class strings sit')} outside every ` +
    `position this reads.`,
)

for (const site of [...report.spliced, ...report.outside]) {
  console.log(`${' '.repeat(10)}${site.file}:${String(site.line)}:${String(site.column)}`)
}

const sites = report.found.reduce((total, finding) => total + finding.sites.length, 0)

console.log(
  `\n${plural(report.found.length, 'class', 'classes')} over ` +
    `${plural(sites, 'site', 'sites')} ${report.found.length === 1 ? 'produces' : 'produce'} ` +
    `no CSS, ${String(report.found.length - report.added.length)} of them recorded. ` +
    `${plural(report.dangling.length, 'declaration reads', 'declarations read')} a custom ` +
    `property nothing defines.`,
)

if (report.added.length > 0 || report.resolved.length > 0) {
  console.log(
    '\nA class that produces no CSS is either a token that was deleted out from under it — ' +
      'packages/ui/src/tokens.css — or a file the scanner never read; apps/web/src/index.css ' +
      'says which files those are. Recording one in internal/class-resolution/src/index.js with ' +
      'the reason it stays is a fair answer and shows up in the diff, where a class that quietly ' +
      'stopped resolving does not.',
  )
}

if (report.dangling.length > 0) {
  // No ledger entry for this half, on purpose. A `var()` with a fallback is how
  // a stylesheet says a missing property is intended, so writing one is both the
  // fix and the record, and it shows up in the diff where a recorded exception
  // in a sensor's own source would not.
  console.log(
    '\nThe class carrying this still exists, which is why the check above is quiet about it: ' +
      'the rule is emitted and the declaration computes to nothing. Put the property back in ' +
      'packages/ui/src/tokens.css, or give the reference a fallback — `var(--x, 0)` — which is ' +
      'how a stylesheet says a missing property is intended.',
  )
}

if (report.added.length > 0 || report.resolved.length > 0 || report.dangling.length > 0) {
  process.exit(1)
}

if (report.unreadable.length > 0) process.exit(1)

/**
 * @param {number} count
 * @param {string} one
 * @param {string} many
 * @returns {string}
 */
function plural(count, one, many) {
  return `${String(count)} ${count === 1 ? one : many}`
}
