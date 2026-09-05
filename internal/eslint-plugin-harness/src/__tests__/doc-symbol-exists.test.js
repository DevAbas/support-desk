import { describe, expect, it } from 'vitest'
import rule from '../rules/doc-symbol-exists.js'
import { createMarkdownRuleTester, createRuleTester, repoFile } from './ruleTester.js'

const ruleTester = createRuleTester()

// Like doc-path-exists, this resolves against the real checkout. The names in
// the invalid cases are deliberately ones nothing declares — and the index
// leaves test files out precisely so that these fixtures cannot vouch for
// themselves once this file is committed.
ruleTester.run('doc-symbol-exists', rule, {
  valid: [
    {
      name: 'the table AGENTS.md tells an agent to edit',
      filename: repoFile('packages/shared/src/workflow.ts'),
      code: '/** Adding a status is an entry in `TICKET_STATUSES`. */\nexport const a = 1',
    },
    {
      name: 'the navigation table the nav, the guard and the search all read',
      filename: repoFile('apps/api/src/search.ts'),
      code: '/** The screens come from `NAVIGATION_TARGETS`. */\nexport const a = 1',
    },
    {
      name: 'a constant reached through a property',
      filename: repoFile('packages/shared/src/customers.ts'),
      code: '/** Capped at `MAX_PAGE_SIZE.value` rows. */\nexport const a = 1',
    },
    {
      name: 'an environment variable, which the code names and so declares',
      filename: repoFile('apps/api/src/main.ts'),
      code: '/** Set `API_FAIL` to make every request fail. */\nexport const a = 1',
    },
    {
      // The shape restriction, which is the entire design. PascalCase and
      // camelCase produced a hundred-and-one unresolved tokens between them on
      // this repository and every one was a false positive, so neither shape is
      // looked at — not even when the name really is missing.
      name: 'a PascalCase name that resolves nowhere, which this rule does not claim to see',
      filename: repoFile('packages/ui/src/index.ts'),
      code: '/** Rendered by `SheetPanel`, which does not exist. */\nexport const a = 1',
    },
    {
      name: 'a camelCase name that resolves nowhere, for the same reason',
      filename: repoFile('packages/ui/src/index.ts'),
      code: '/** Call `useSheetPanel` first. */\nexport const a = 1',
    },
    {
      name: 'an unbackticked name, which is prose rather than a citation',
      filename: repoFile('packages/shared/src/workflow.ts'),
      code: '/** Written in SCREAMING_SNAKE_CASE, like every table here. */\nexport const a = 1',
    },
    {
      name: 'a shell word carrying a value, which is not a name',
      filename: repoFile('apps/api/src/main.ts'),
      code: '/** Run `API_LATENCY_MS=0 npm run dev`. */\nexport const a = 1',
    },
  ],

  invalid: [
    {
      name: 'a table renamed out from under the sentence telling an agent to edit it',
      filename: repoFile('packages/shared/src/workflow.ts'),
      code: '/** Add a label beside it in `TICKET_STATE_LABELS`. */\nexport const a = 1',
      errors: [{ messageId: 'missingSymbol', data: { symbol: 'TICKET_STATE_LABELS' } }],
    },
    {
      name: 'the navigation table under a name it never had',
      filename: repoFile('apps/web/src/features/roles/RequireRole.tsx'),
      code: '// Gated through `NAVIGATION_ITEMS`.\nexport const a = 1',
      errors: [{ messageId: 'missingSymbol' }],
    },
    {
      name: 'two in one comment, reported apiece',
      filename: repoFile('packages/shared/src/index.ts'),
      code: '/** Keyed by `TICKET_STATE_LABELS` and `CUSTOMER_TIER_LABELS`. */\nexport const a = 1',
      errors: [{ messageId: 'missingSymbol' }, { messageId: 'missingSymbol' }],
    },
  ],
})

const markdownTester = createMarkdownRuleTester()

markdownTester.run('doc-symbol-exists over Markdown', rule, {
  valid: [
    {
      name: "AGENTS.md's own instruction, which is the reason this rule exists",
      filename: repoFile('AGENTS.md'),
      code: 'Adding a fifth status is an entry in `TICKET_STATUSES`, a label in\n`TICKET_STATUS_LABELS`.\n',
    },
  ],

  invalid: [
    {
      name: 'the same instruction after a rename nobody carried into the prose',
      filename: repoFile('AGENTS.md'),
      code: 'Adding a fifth status is an entry in `TICKET_STATE_LIST`.\n',
      errors: [{ messageId: 'missingSymbol', data: { symbol: 'TICKET_STATE_LIST' } }],
    },
  ],
})

describe('doc-symbol-exists message', () => {
  const message = rule.meta.messages.missingSymbol

  it('names the offender and both answers', () => {
    expect(message).toContain('{{symbol}}')
    expect(message).toContain('Correct the name or drop it')
  })

  it('says why it is worth reporting at all', () => {
    expect(message).toContain('reads exactly like')
  })

  it('stays short and points at the README for the reasoning', () => {
    expect(message.length).toBeLessThan(280)
    expect(message).toContain('internal/eslint-plugin-harness/README.md')
  })
})
