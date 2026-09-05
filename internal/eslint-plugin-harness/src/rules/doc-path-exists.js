/**
 * doc-path-exists — a comment or a README citing a file that is not there.
 *
 * Why this rule exists
 * --------------------
 * Prose contradicting the code beside it is the largest recurring category of
 * defect in this repository and the only one nothing was watching. Most of it
 * cannot be caught: "a glance should not be a history entry" is a claim about
 * behaviour, and no tool is going to check it.
 *
 * A file path is the exception. It is a reference, it either resolves or it does
 * not, and when it stops resolving the sentence holding it has almost always
 * gone stale too. Six of them are wrong today, and every one dates from a
 * structural move that the prose was not moved with:
 *
 *   - The root README pointed at a `src/design-system/` and a `src/lib/` that
 *     the move to workspaces had renamed to `packages/ui/`, `apps/api/src/` and
 *     `packages/shared/src/`. One of the four was a Markdown link, so the
 *     README's own "read this first" pointer was a 404.
 *   - `apps/web/vite.config.ts` said its port was "kept in step with" a file
 *     under `server/`, which the same move turned into `apps/api/`. The
 *     sentence still read as though somebody were keeping it in step.
 *
 * None of this was hidden. All of it was read past, repeatedly, by people and by
 * agents, because a stale path reads exactly like a fresh one.
 *
 * Known limitations
 * -----------------
 * **It checks that a file exists, not that the sentence is true.** The root
 * README opens by saying this repository has "no `AGENTS.md`, no `CLAUDE.md`, no
 * lint rule that enforces the design system". All three are now false, and this
 * rule cannot tell — the sentence cites nothing. That is most of the category
 * and it stays uncaught.
 *
 * **Resolution is deliberately generous.** Five tiers are tried, ending in a
 * suffix match against the whole tracked list, because prose has never written
 * repo-relative paths and should not have to start. The cost is that a path
 * which matches some *other* file with the same tail is accepted. The benefit is
 * that the rule ships without turning a documentation convention into a hundred
 * violations, and what survives all five tiers names no file at all.
 *
 * **A path must have a slash and an extension to be seen.** `package.json` on
 * its own, `src/features/` with no file, and `@support-desk/ui` are all invisible
 * — the first two by choice, since a bare name in a sentence is usually a
 * category rather than a citation, and the third because it is a package name.
 *
 * **It reads text, not code.** A path built at runtime, or held in a constant, is
 * not a citation and is not checked; `dependency-cruiser` and the module
 * resolver already own real imports.
 */

import {
  citedPathResolves,
  citedPathsIn,
  findRepoRoot,
  loadRepoIndex,
  locateWithin,
  resolutionRootsFor,
} from '../docIndex.js'
import path from 'node:path'

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Keep a file path written in a comment or a README pointing at a file',
    },
    schema: [],
    // One or two sentences: what to do, and where the reasoning is. The rest is
    // in the docblock above and in the README, which are read once — a message
    // is read once per violation.
    messages: {
      missingPath:
        '`{{citedPath}}` names no file in this repository. Correct the path or drop it — a ' +
        'comment citing a file that moved reads exactly like one citing a file that did not. ' +
        'See internal/eslint-plugin-harness/README.md.',
    },
  },

  create(context) {
    const root = findRepoRoot(context.filename)
    const index = loadRepoIndex(root)

    if (index.isEmpty) return {}

    const relativeFilePath = path.relative(root, context.filename).replaceAll('\\', '/')
    const roots = resolutionRootsFor(relativeFilePath, index.packageDirs)
    const sourceCode = context.sourceCode
    const reported = new Set()

    function scan(text, start) {
      for (const { citedPath, index: offset } of citedPathsIn(text)) {
        if (citedPathResolves(citedPath, roots, index)) continue

        const loc = locateWithin(text, offset, start)
        // A Markdown link writes its target twice — once as the label, once as
        // the URL — and two reports on one line is one problem read twice.
        const seen = `${String(loc.line)}:${citedPath}`

        if (reported.has(seen)) continue

        reported.add(seen)

        context.report({
          loc: { start: loc, end: { line: loc.line, column: loc.column + citedPath.length } },
          messageId: 'missingPath',
          data: { citedPath },
        })
      }
    }

    return {
      // TypeScript and JavaScript: every comment, not only docblocks. A `// see
      // foo.ts` goes stale the same way a `/** */` does.
      Program() {
        for (const comment of sourceCode.getAllComments()) {
          scan(sourceCode.text.slice(comment.range[0], comment.range[1]), comment.loc.start)
        }
      },

      // Markdown, through @eslint/markdown's `commonmark` language. The whole
      // document is prose about the code, so the whole document is read —
      // fenced blocks included, since a path in an example is a citation too.
      root() {
        scan(sourceCode.getText(), { line: 1, column: 0 })
      },
    }
  },
}
