/**
 * doc-symbol-exists — a docblock or a README naming a symbol that no longer resolves.
 *
 * Why this rule exists
 * --------------------
 * This codebase resolves its branching with lookup tables and then tells every
 * reader to go and edit them. AGENTS.md: "Adding a fifth status is an entry in
 * `TICKET_STATUSES`, a label in `TICKET_STATUS_LABELS`…"; "`NAVIGATION_TARGETS`
 * in the shared contract is the one, and the header nav, the route guard and the
 * global search all read it." Those sentences are the instructions an agent
 * follows. Twenty-five such citations exist across AGENTS.md, both READMEs and
 * the docblocks.
 *
 * A rename breaks all of them at once and silently. `measure 11` renamed the npm
 * scope across the whole repository; the same edit against a table name would
 * have left every one of those sentences pointing at nothing, with `tsc`, the
 * tests and the lint pass all clean, and the next agent reading the instruction
 * and finding no such export.
 *
 * The rule ships with zero violations. That is what it is for: it is a ratchet
 * against a rename, not a cleanup of one.
 *
 * Why only SCREAMING_SNAKE_CASE
 * -----------------------------
 * Because it is the only shape that can be resolved without an allowlist, and
 * the numbers are worth writing down. Measured over every backticked token in
 * every comment and Markdown file in this repository, resolved against every
 * identifier that appears anywhere in the code:
 *
 *   SCREAMING_SNAKE_CASE   25 cited, 25 resolve,  0 unresolved
 *   PascalCase            426 cited,             30 unresolved, all false
 *   camelCase             193 cited,             71 unresolved, all false
 *
 * Every one of the hundred-and-one is prose citing something that is not this
 * codebase's to declare: the platform (`Map`, `Date`, `AbortSignal`), a library
 * (`MemoryRouter`, `useQuery`, `isPending`, `RuleTester`), the DOM (`className`,
 * `htmlFor`), a keyboard (`Cmd`, `Ctrl`), a cookie attribute (`Strict`,
 * `Secure`), or the *value* of a string rather than a name (`Unassigned`).
 * Resolving those needs a list of every symbol of every dependency, and a rule
 * that needs a hand-maintained allowlist to stay quiet is a rule that will be
 * turned off.
 *
 * SCREAMING_SNAKE_CASE is the shape this codebase reserves for its own tables, so
 * the shape restriction is not a heuristic about names — it is a statement about
 * which citations this repository is in a position to check.
 *
 * Known limitations
 * -----------------
 * **It sees a quarter of the symbols cited and does not try for the rest.** A
 * renamed component, hook or function named in prose is not caught. That is the
 * measured cost of shipping with no false positives, and it is the right trade
 * here only because the tables are what the instructions actually point at.
 *
 * **Resolution is repo-wide, not scoped.** A name declared in any file satisfies
 * a citation in any other. Scoping it to the citing file's own imports was
 * tried and is wrong: `AGENTS.md` legitimately names `TICKET_STATUSES` and
 * imports nothing.
 *
 * **It checks that the name exists, not that the sentence around it is true.**
 * `TICKET_STATUSES` keeping its name while its meaning changes is invisible here.
 */

import {
  citedSymbolsIn,
  findRepoRoot,
  loadRepoIndex,
  locateWithin,
} from '../docIndex.js'

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Keep a symbol named in a comment or a README resolving to a real declaration',
    },
    schema: [],
    // One or two sentences: what to do, and where the reasoning is. The rest is
    // in the docblock above and in the README, which are read once.
    messages: {
      missingSymbol:
        '`{{symbol}}` is declared nowhere in this repository. Correct the name or drop it — ' +
        'prose naming a table that was renamed reads exactly like prose naming one that was ' +
        'not. See internal/eslint-plugin-harness/README.md.',
    },
  },

  create(context) {
    const index = loadRepoIndex(findRepoRoot(context.filename))

    if (index.isEmpty) return {}

    const sourceCode = context.sourceCode
    const reported = new Set()

    function scan(text, start) {
      for (const { symbol, index: offset } of citedSymbolsIn(text)) {
        if (index.declaredNames.has(symbol)) continue

        const loc = locateWithin(text, offset, start)
        const seen = `${String(loc.line)}:${symbol}`

        if (reported.has(seen)) continue

        reported.add(seen)

        context.report({
          loc: { start: loc, end: { line: loc.line, column: loc.column + symbol.length } },
          messageId: 'missingSymbol',
          data: { symbol },
        })
      }
    }

    return {
      Program() {
        for (const comment of sourceCode.getAllComments()) {
          scan(sourceCode.text.slice(comment.range[0], comment.range[1]), comment.loc.start)
        }
      },

      root() {
        scan(sourceCode.getText(), { line: 1, column: 0 })
      },
    }
  },
}
