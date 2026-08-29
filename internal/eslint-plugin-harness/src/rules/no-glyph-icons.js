/**
 * no-glyph-icons — a Unicode character standing in for an icon.
 *
 * Why this rule exists
 * --------------------
 * Five of these were written across four measurements of this codebase, and
 * nothing caught any of them: a pencil and a cross in the saved views sidebar, a
 * cross again in `Modal` and in `Drawer`, and the three arrows in `StatCard`.
 * They type-check, they render, and they look right in a screenshot, which is
 * exactly why they survive review.
 *
 * They cost two things. A glyph takes its size and its colour from the type
 * around it, so it is not on the icon scale and cannot be put on it — the close
 * cross in a dialog title grew and shrank with the title. And a screen reader
 * reads it as a word: the back link on the ticket screen announced itself as
 * "left arrow, Back to tickets", and a cross is announced as "multiplication
 * sign", or in some voices skipped in silence.
 *
 * `Icon` fixes both by construction. It is sized from the spacing scale rather
 * than from the surrounding text, and `label` is required — an icon cannot be
 * rendered without someone having decided what it says. The name comes from the
 * `IconName` union, so an unwired name is a compile error and not a blank
 * square.
 *
 * Only JSX text is flagged. A non-ASCII character in a string literal or an
 * attribute is prose — the ellipsis in "Loading…", an en dash between two page
 * numbers, a customer's name — and prose in other languages must stay writable.
 * That is also the escape hatch the message points at: a character that really
 * is text belongs in a string literal, where this rule stops looking.
 */

/** ASCII is every code point below 128; a glyph is anything above it. */
function isNonAscii(character) {
  return (character.codePointAt(0) ?? 0) > 127
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Render an icon through the Icon primitive rather than as a Unicode character in JSX text',
    },
    schema: [],
    // One or two sentences: what to use, where it lives, where the reasoning
    // is. The rest is in the docblock above and in the README, which are read
    // once — a message is read once per violation.
    messages: {
      // No worked example: a fixed one would print `<Icon name="close" />`
      // against an ellipsis, where moving it into a string is the right answer
      // and an Icon is not. `IconName` is the pointer that works for both.
      glyphInJsxText:
        'Use the Icon primitive from @harness-sample/ui instead of the glyph {{glyphs}}, named ' +
        'from the IconName union — or, if it is genuinely text, move it into a string literal. ' +
        'See internal/eslint-plugin-harness/README.md.',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode

    return {
      JSXText(node) {
        const raw = sourceCode.getText(node)

        // The parser decodes HTML entities into `value`, so `&#215;` arrives
        // here as a cross while the source still reads as ASCII. Both spellings
        // are the same defect and both are reported; only the one written as a
        // literal character can be pointed at precisely.
        const rawHits = offendersIn(raw)

        if (rawHits.length > 0) {
          for (const hit of rawHits) {
            context.report({
              node,
              loc: locOf(node, raw, hit.index),
              messageId: 'glyphInJsxText',
              data: { glyphs: quote([hit.character]) },
            })
          }

          return
        }

        const decoded = offendersIn(String(node.value))

        if (decoded.length > 0) {
          context.report({
            node,
            messageId: 'glyphInJsxText',
            data: { glyphs: quote(decoded.map((hit) => hit.character)) },
          })
        }
      },
    }
  },
}

/** Every non-ASCII character in `text`, with the offset it sits at. */
function offendersIn(text) {
  const hits = []

  // Iterated by code point rather than by code unit, so an astral character —
  // an emoji used as an icon, which is the same defect — is one hit and not two
  // halves of a surrogate pair.
  let index = 0

  for (const character of text) {
    if (isNonAscii(character)) hits.push({ character, index })
    index += character.length
  }

  return hits
}

/** The position of `index` within a node, counted from where the node starts. */
function locOf(node, text, index) {
  let line = node.loc.start.line
  let column = node.loc.start.column

  for (let at = 0; at < index; at += 1) {
    if (text[at] === '\n') {
      line += 1
      column = 0
    } else {
      column += 1
    }
  }

  return { start: { line, column }, end: { line, column: column + 1 } }
}

function quote(characters) {
  return characters.map((character) => `"${character}"`).join(', ')
}
