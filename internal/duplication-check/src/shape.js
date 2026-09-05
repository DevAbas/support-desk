/**
 * shape — a file reduced to the sequence of syntax it is made of.
 *
 * Why this is the unit
 * --------------------
 * The defect this tool exists for is a file written by copying another and
 * changing the names in it. What survives that edit is the *shape*: the same
 * declarations in the same order, the same call wrapping the same arrow function
 * wrapping the same conditional. What does not survive it is every identifier and
 * every string, which is precisely what a token-based copy-paste detector hashes.
 *
 * So the sequence emitted here is node **types** and nothing else. An `Identifier`
 * contributes the word "Identifier" whether it says `ticket` or `customer`; a
 * string literal contributes "Literal" whether it says `'tickets'` or
 * `'customers'`. Two files that differ only in their nouns produce identical
 * sequences, and that is the whole measurement.
 *
 * What it costs: two files that are the same idea written differently — a `for`
 * loop against a `.reduce()` — do not match, and should not. And two files that
 * are genuinely different work sharing a common skeleton do match, which is why
 * the caller thresholds on proportion and keeps a list of the pairs that are
 * parallel on purpose.
 */

import { parse } from '@typescript-eslint/parser'

/** Keys that hold position and parent rather than syntax. */
const NOT_SYNTAX = new Set(['parent', 'loc', 'range', 'start', 'end', 'comments', 'tokens'])

/**
 * The node types of `source`, depth-first, in source order.
 *
 * Parsed with the same parser the lint pass uses, so a file that lints is a file
 * this can read — including every TypeScript and JSX form the codebase uses.
 * Comments are not in the tree, so prose differences never register as shape.
 */
export function shapeOf(source, filePath) {
  const ast = parse(source, {
    ecmaVersion: 2023,
    sourceType: 'module',
    jsx: filePath.endsWith('.tsx'),
    loc: true,
    range: false,
    comment: false,
  })

  const types = []
  const lines = []

  walk(ast, types, lines)

  return { types, lines }
}

function walk(node, types, lines) {
  types.push(node.type)
  lines.push(node.loc === undefined ? 0 : node.loc.start.line)

  for (const [key, child] of Object.entries(node)) {
    if (NOT_SYNTAX.has(key)) continue

    if (Array.isArray(child)) {
      for (const item of child) {
        if (isNode(item)) walk(item, types, lines)
      }
      continue
    }

    if (isNode(child)) walk(child, types, lines)
  }
}

function isNode(value) {
  return value !== null && typeof value === 'object' && typeof value.type === 'string'
}
