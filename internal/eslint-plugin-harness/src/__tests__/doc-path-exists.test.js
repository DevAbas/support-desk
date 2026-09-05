import { describe, expect, it } from 'vitest'
import rule from '../rules/doc-path-exists.js'
import { createMarkdownRuleTester, createRuleTester, repoFile } from './ruleTester.js'

const ruleTester = createRuleTester()

// The rule resolves against the real checkout, so the cases carry real
// filenames and invented contents. A fixture tree would have to be kept in step
// with the real one to mean anything, and keeping prose in step with a tree is
// the defect this rule exists for.
ruleTester.run('doc-path-exists', rule, {
  valid: [
    {
      name: 'a repo-relative path, resolved from the root',
      filename: repoFile('packages/shared/src/workflow.ts'),
      code: '/** The statuses live in `packages/shared/src/types.ts`. */\nexport const a = 1',
    },
    {
      name: 'a package-relative path, which is how this plugin cites itself',
      filename: repoFile('internal/eslint-plugin-harness/src/index.js'),
      code: '// Promotion is one edit to `src/rules/no-glyph-icons.js`.\nexport const a = 1',
    },
    {
      name: 'a src-relative path, which is how the app cites itself',
      filename: repoFile('apps/web/src/lib/csv.ts'),
      code: '/** The header lives in `features/tickets/ticketsCsv.ts`. */\nexport const a = 1',
    },
    {
      name: 'a path relative to the citing file itself',
      filename: repoFile('packages/ui/src/components/Modal/Modal.tsx'),
      code: '/** Everything shared is in `../Dialog/Dialog.tsx`. */\nexport const a = 1',
    },
    {
      name: 'a loose citation of another package, matched by suffix',
      filename: repoFile('internal/eslint-plugin-harness/src/index.js'),
      code: '// The exemption is `primitives/Avatar/Avatar.tsx`.\nexport const a = 1',
    },
    {
      name: 'a URL, which is not this repository to check',
      filename: repoFile('packages/shared/src/workflow.ts'),
      code: '/** See https://example.com/docs/thing.html for the argument. */\nexport const a = 1',
    },
    {
      name: 'a dependency, which is not this repository either',
      filename: repoFile('packages/shared/src/cn.ts'),
      code: '// Registered in node_modules/tailwind-merge/dist/index.js.\nexport const a = 1',
    },
    {
      name: 'a package name, which has a slash but is not a file',
      filename: repoFile('packages/ui/src/index.ts'),
      code: '/** Imported from `@support-desk/shared`. */\nexport const a = 1',
    },
    {
      name: 'a bare filename, which is a category in a sentence rather than a citation',
      filename: repoFile('packages/ui/src/index.ts'),
      code: '/** Declared in package.json, like every workspace. */\nexport const a = 1',
    },
    {
      name: 'a directory, which the rule does not claim to resolve',
      filename: repoFile('packages/shared/src/workflow.ts'),
      code: '/** The screens are under `apps/web/src/features/`. */\nexport const a = 1',
    },
    {
      name: 'code, not prose: a real import is dependency-cruiser and the resolver',
      filename: repoFile('packages/ui/src/index.ts'),
      code: "export { thing } from './components/Sheet/Sheet.tsx'",
    },
    {
      // The generosity the docblock admits to, pinned. `src/lib/api/http.ts` is
      // the pre-workspace spelling of a file that still exists at
      // `apps/web/src/lib/api/http.ts`, and the suffix tier accepts it. That is
      // the price of not making a documentation convention into a hundred
      // violations, and it is a price this rule pays knowingly.
      name: 'a pre-workspace spelling whose tail still matches a real file',
      filename: repoFile('packages/shared/src/index.ts'),
      code: '/** The wrapper is `src/lib/api/http.ts`. */\nexport const a = 1',
    },
  ],

  invalid: [
    {
      name: 'the seed file the move to workspaces relocated',
      filename: repoFile('README.md.ts'),
      code: '/** Generated in `src/lib/seed.ts`, deterministically. */\nexport const a = 1',
      errors: [{ messageId: 'missingPath', data: { citedPath: 'src/lib/seed.ts' } }],
    },
    {
      name: 'the API entry point, cited two commits after server/ became apps/api/',
      filename: repoFile('apps/web/vite.config.ts'),
      code: '/** Kept in step with the port `server/main.ts` defaults to. */\nexport const a = 1',
      errors: [{ messageId: 'missingPath', data: { citedPath: 'server/main.ts' } }],
    },
    {
      name: 'a file that never existed',
      filename: repoFile('packages/ui/src/index.ts'),
      code: '// The panel is `packages/ui/src/components/Sheet/Sheet.tsx`.\nexport const a = 1',
      errors: [{ messageId: 'missingPath' }],
    },
    {
      name: 'a line comment goes stale exactly as a docblock does',
      filename: repoFile('apps/api/src/store.ts'),
      code: '// See src/lib/api/contract.ts for the schemas.\nexport const a = 1',
      errors: [{ messageId: 'missingPath' }],
    },
    {
      name: 'two dead paths in one comment, reported apiece',
      filename: repoFile('packages/shared/src/index.ts'),
      code: '/** Was `src/lib/seed.ts`, then `src/design-system/README.md`. */\nexport const a = 1',
      errors: [{ messageId: 'missingPath' }, { messageId: 'missingPath' }],
    },
  ],
})

const markdownTester = createMarkdownRuleTester()

markdownTester.run('doc-path-exists over Markdown', rule, {
  valid: [
    {
      name: 'a README citing a file that is there',
      filename: repoFile('README.md'),
      code: 'The design system is in [`packages/ui/README.md`](packages/ui/README.md).\n',
    },
    {
      name: 'a fenced example whose paths resolve',
      filename: repoFile('packages/ui/README.md'),
      code: '```tsx\n// packages/ui/src/components/List/List.tsx\n```\n',
    },
  ],

  invalid: [
    {
      name: "the README's own read-this-first pointer, which was a 404",
      filename: repoFile('README.md'),
      code: 'The rules are in [`src/design-system/README.md`](src/design-system/README.md).\n',
      // Written twice on one line — as the label and as the link target — and
      // reported once, because two reports on one line is one problem read twice.
      errors: [{ messageId: 'missingPath', data: { citedPath: 'src/design-system/README.md' } }],
    },
    {
      name: 'prose citing a module that moved',
      filename: repoFile('README.md'),
      code: 'Cache keys are built in `src/features/tickets/keys.ts`.\n',
      errors: [{ messageId: 'missingPath' }],
    },
  ],
})

describe('doc-path-exists message', () => {
  const message = rule.meta.messages.missingPath

  it('names the offender and both answers', () => {
    expect(message).toContain('{{citedPath}}')
    expect(message).toContain('Correct the path or drop it')
  })

  it('says why it is worth reporting at all', () => {
    expect(message).toContain('reads exactly like')
  })

  it('stays short and points at the README for the reasoning', () => {
    expect(message.length).toBeLessThan(280)
    expect(message).toContain('internal/eslint-plugin-harness/README.md')
  })
})
