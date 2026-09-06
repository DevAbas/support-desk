/**
 * source — the class strings in one file, and where they are.
 *
 * Why by AST position and not by regex
 * ------------------------------------
 * A class name in this repository is written in four places, and only one of
 * them is a `className` attribute. The others are `cn()` arguments, the
 * module-level `Record<Union, string>` above each primitive — which is where
 * `Alert.tsx` keeps `rounded-element` — and `toHaveClass`, which is the whole
 * reason `Alert.test.tsx` is part of the story. A regex over `className="..."`
 * sees one of the four.
 *
 * So a literal is read as a class string when it sits in a *value position* that
 * produces one, and the work is entirely in the word value. Measured on this
 * repository, a flag that propagates to every descendant instead reports 31
 * strings that are not classes; the same flag scoped to values reports none. The
 * four that matter:
 *
 *   - not into a call's callee, or `expect(screen.getByRole('button')).toHaveClass(…)`
 *     reports `button`;
 *   - not into an element access's index, or `intentClasses[change.intent ?? 'neutral']`
 *     reports `neutral`;
 *   - not into a condition, or `variant === 'primary' && 'bg-primary'` reports `primary`;
 *   - not into a non-class call's arguments, because the class is what that call
 *     returns, not what it was handed.
 *
 * Known limitations
 * -----------------
 * **A class spliced with an expression cannot be read.** `` `rounded-${size}` ``
 * has no whole token in it. Those fragments are counted and reported rather than
 * dropped; the count is 0 today, because nothing here builds a class name.
 *
 * **The `*Classes` naming convention is load-bearing.** Rename `variantClasses`
 * to `variantStyles` and its literals stop being read. That is why `outside`
 * exists: every run counts the literals that look like class lists and sit in
 * none of these positions, so the day the convention breaks, the report says so
 * instead of the coverage quietly dropping.
 */

import ts from 'typescript'
import { CLASS_CALLS, CLASS_VARIABLE, isClassAttribute } from './index.js'

/**
 * @typedef {object} Occurrence
 * @property {string} name
 * @property {number} line
 * @property {number} column
 */

/**
 * @typedef {object} FileScan
 * @property {Occurrence[]} tokens Whole class names written in a class position.
 * @property {Occurrence[]} spliced Fragments an interpolation runs into.
 * @property {Occurrence[]} outside Class-looking strings no position rule reached.
 * @property {number} classStrings How many literals were read as class strings.
 */

/**
 * The class strings in one file.
 *
 * @param {string} source
 * @param {string} fileName
 * @param {(name: string) => boolean} isKnownClass
 * @returns {FileScan}
 */
export function scanSource(source, fileName, isKnownClass) {
  const kind = /\.[jt]sx$/.test(fileName) ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, kind)

  /** @type {Occurrence[]} */
  const tokens = []
  /** @type {Occurrence[]} */
  const spliced = []
  /** @type {Occurrence[]} */
  const outside = []
  let classStrings = 0

  /**
   * @param {ts.Node} node
   * @param {string} text
   * @param {boolean} inClassPosition
   * @param {boolean} before An interpolation precedes this chunk.
   * @param {boolean} after An interpolation follows it.
   */
  const read = (node, text, inClassPosition, before, after) => {
    const parts = split(text)
    if (parts.length === 0) return

    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
    const oneLine = !text.includes('\n')

    /** @param {number} offset */
    const at = (offset) => ({
      line: start.line + 1,
      // +1 steps over the opening quote, backtick or `}`.
      column: oneLine ? start.character + offset + 2 : start.character + 1,
    })

    if (!inClassPosition) {
      // Not a finding, a measurement: a class list this file writes somewhere
      // none of the position rules look. See the docblock.
      if (parts.some((part) => part.name.includes('-') && isKnownClass(part.name))) {
        outside.push({ name: text.trim(), ...at(0) })
      }
      return
    }

    classStrings += 1

    // An interpolation only runs into a token when no whitespace separates
    // them: in `` `flex rounded-${size} border` `` the head ends mid-token and
    // the tail starts after a space, so `rounded-` is a fragment and `border` is
    // a class. Whitespace inside the chunk is what says which.
    const first = parts[0]
    const last = parts[parts.length - 1]
    const opensFirst = before && first !== undefined && first.offset === 0
    const opensLast =
      after && last !== undefined && last.offset + last.name.length === text.length

    for (const [index, part] of parts.entries()) {
      const open = (index === 0 && opensFirst) || (index === parts.length - 1 && opensLast)

      const occurrence = { name: part.name, ...at(part.offset) }
      if (open) spliced.push(occurrence)
      else tokens.push(occurrence)
    }
  }

  /**
   * @param {ts.Node} node
   * @param {boolean} inClassPosition
   * @returns {void}
   */
  const visit = (node, inClassPosition) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      read(node, node.text, inClassPosition, false, false)
      return
    }

    if (ts.isTemplateHead(node)) {
      read(node, node.text, inClassPosition, false, true)
      return
    }

    if (ts.isTemplateMiddle(node)) {
      read(node, node.text, inClassPosition, true, true)
      return
    }

    if (ts.isTemplateTail(node)) {
      read(node, node.text, inClassPosition, true, false)
      return
    }

    if (ts.isJsxAttribute(node)) {
      // An attribute that is not a class attribute closes the position, so JSX
      // nested inside one does not inherit it.
      if (node.initializer !== undefined) {
        visit(node.initializer, isClassAttribute(node.name.getText(sourceFile)))
      }
      return
    }

    if (ts.isCallExpression(node)) {
      const callee = node.expression
      const name = ts.isPropertyAccessExpression(callee)
        ? callee.name.text
        : ts.isIdentifier(callee)
          ? callee.text
          : ''

      visit(callee, inClassPosition)

      const args = CLASS_CALLS.has(name)
      for (const argument of node.arguments) visit(argument, args)
      return
    }

    if (ts.isVariableDeclaration(node)) {
      const named = ts.isIdentifier(node.name) && CLASS_VARIABLE.test(node.name.text)
      if (node.initializer !== undefined) visit(node.initializer, named || inClassPosition)
      return
    }

    if (ts.isPropertyAssignment(node)) {
      visit(node.initializer, inClassPosition)
      return
    }

    if (ts.isElementAccessExpression(node)) {
      visit(node.expression, inClassPosition)
      visit(node.argumentExpression, false)
      return
    }

    if (ts.isConditionalExpression(node)) {
      visit(node.condition, false)
      visit(node.whenTrue, inClassPosition)
      visit(node.whenFalse, inClassPosition)
      return
    }

    if (ts.isTemplateSpan(node)) {
      visit(node.expression, false)
      visit(node.literal, inClassPosition)
      return
    }

    if (ts.isBinaryExpression(node)) {
      const operator = node.operatorToken.kind
      const concatenation = operator === ts.SyntaxKind.PlusToken

      visit(node.left, concatenation && inClassPosition)
      visit(node.right, carries(operator) && inClassPosition)
      return
    }

    ts.forEachChild(node, (child) => {
      visit(child, inClassPosition)
    })
  }

  visit(sourceFile, false)

  return { tokens, spliced, outside, classStrings }
}

/**
 * Whether the right of a binary expression is the value the left stands in for.
 *
 * `error && 'border-danger'` and `tone ?? 'bg-muted'` both hand their right side
 * on as the class; a comparison hands on a boolean.
 *
 * @param {ts.SyntaxKind} operator
 * @returns {boolean}
 */
function carries(operator) {
  return (
    operator === ts.SyntaxKind.PlusToken ||
    operator === ts.SyntaxKind.AmpersandAmpersandToken ||
    operator === ts.SyntaxKind.BarBarToken ||
    operator === ts.SyntaxKind.QuestionQuestionToken ||
    operator === ts.SyntaxKind.EqualsToken
  )
}

/**
 * The whitespace-separated tokens of a class string, with where each one starts.
 *
 * @param {string} text
 * @returns {{ name: string, offset: number }[]}
 */
function split(text) {
  /** @type {{ name: string, offset: number }[]} */
  const parts = []

  for (const match of text.matchAll(/\S+/g)) {
    if (match[0] !== undefined && match.index !== undefined) {
      parts.push({ name: match[0], offset: match.index })
    }
  }

  return parts
}
