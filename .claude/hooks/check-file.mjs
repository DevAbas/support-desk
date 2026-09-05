#!/usr/bin/env node
/**
 * The fast half of the gate, run after an agent writes a file.
 *
 * Why here rather than only in CI
 * -------------------------------
 * A check is worth what it costs to act on, and that cost is set by when it
 * arrives. An agent that finishes a task and hands back work that does not
 * compile has already stopped: somebody reads the failure, comes back, and pays
 * for a second round trip through a context that has moved on. The same failure
 * delivered one tool call after the file was written is a correction the agent
 * makes itself, while it still remembers why it wrote the line.
 *
 * So the two checks that are fast enough to run per file run here — typecheck
 * and lint — and everything that reads the whole repository at once runs in CI.
 * `README.md` has the table of which is which and why.
 *
 * Why it runs the strict tier
 * ---------------------------
 * `internal/eslint-plugin-harness/README.md` sets the rule and this is the first
 * thing to honour it: "an agent has no excuse for violating a stated rule, a
 * human mid-edit does". An agent read the rule in the same context window it
 * wrote the code in. So `HARNESS_STRICT_LINT=1`, which is the tier CI uses, and
 * an agent gets the same answer here that the merge will give it later.
 *
 * Warnings do not block, at either tier. A warning is a rule the codebase has
 * not caught up with, recorded in `ROLLOUT`, and stopping an agent on one would
 * teach it to fix somebody else's backlog mid-task.
 *
 * Exit codes are the interface: 2 hands stderr back to the agent to act on, 0 is
 * silence. Anything this script cannot do — no node, no eslint, a file outside
 * the repo — is silence too. A gate that fails closed on its own bugs is a gate
 * somebody turns off.
 */

import { execFileSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'

const LINTED = /\.(?:ts|tsx|js|jsx|mjs|cjs|md)$/
const TYPECHECKED = /\.(?:ts|tsx)$/

const root = process.cwd()

function readEvent() {
  let raw = ''

  try {
    raw = execFileSync('cat', [], { stdio: ['inherit', 'pipe', 'ignore'], encoding: 'utf8' })
  } catch {
    return null
  }

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function run(command, args, env = {}) {
  try {
    execFileSync(command, args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...env },
    })

    return null
  } catch (error) {
    const output = `${error.stdout ?? ''}${error.stderr ?? ''}`.trim()

    // A missing binary is not a lint failure. Silence rather than a wall of
    // ENOENT in the agent's context.
    if (error.code === 'ENOENT') return null

    return output === '' ? null : output
  }
}

const event = readEvent()
const filePath = event?.tool_input?.file_path

if (typeof filePath !== 'string' || filePath === '') process.exit(0)

const absolute = path.resolve(root, filePath)

// Only files in this repository, and only the ones these two tools read.
if (!absolute.startsWith(`${root}${path.sep}`)) process.exit(0)
if (!LINTED.test(absolute)) process.exit(0)

const problems = []

// One file. The whole pass is five seconds and this is roughly one, which is the
// difference between a check that runs on every write and one that does not.
const lint = run('npx', ['--no-install', 'eslint', absolute], { HARNESS_STRICT_LINT: '1' })

if (lint !== null) problems.push(lint)

// The whole project, because a type error is rarely in the file that caused it —
// a changed export breaks its importers. `tsc -b` is incremental, so this is a
// quarter of a second when nothing else moved.
if (TYPECHECKED.test(absolute)) {
  const typecheck = run('npx', ['--no-install', 'tsc', '-b'])

  if (typecheck !== null) problems.push(typecheck)
}

if (problems.length === 0) process.exit(0)

process.stderr.write(
  `${problems.join('\n\n')}\n\n` +
    'Fix these before moving on. Lint runs at the strict tier here, the same tier CI uses; ' +
    'warnings are not blocking. The slower checks — the test suite, the workspace boundaries, ' +
    'the duplication check and the mutation run — are in CI, and README.md says why each is ' +
    'where it is.\n',
)
process.exit(2)
