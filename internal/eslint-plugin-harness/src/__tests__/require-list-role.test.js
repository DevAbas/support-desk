import { describe, expect, it } from 'vitest'
import rule from '../rules/require-list-role.js'
import { appShellFile, createRuleTester, featureFile, uiFile } from './ruleTester.js'

const ruleTester = createRuleTester()

ruleTester.run('require-list-role', rule, {
  valid: [
    {
      name: 'the explicit role, which is what List writes',
      filename: uiFile('components/List/List.tsx'),
      code: 'const a = <ul role="list" aria-label={label} className="flex flex-col" />',
    },
    {
      name: 'an ordered list carrying it too',
      filename: featureFile('tickets/components/CommentList.tsx'),
      code: 'const a = <ol role="list" className="flex flex-col gap-4">{rows}</ol>',
    },
    {
      name: 'a different role, which is a decision somebody made',
      filename: uiFile('components/CommandPalette/CommandPalette.tsx'),
      code: 'const a = <ul role="listbox" aria-label="Results">{options}</ul>',
    },
    {
      name: 'role="presentation", which says the semantics are deliberately gone',
      filename: featureFile(),
      code: 'const a = <ul role="presentation">{rows}</ul>',
    },
    {
      name: 'the List primitive, which is the fix',
      filename: featureFile(),
      code: 'const a = <List label="Customers">{rows}</List>',
    },
    {
      // The scope gate fires before the element is looked at, which is why this
      // case has to be hypothetical: `apps/api` and `packages/shared` render
      // nothing, so neither contains a list to find.
      name: 'a list in a package that renders nothing is not this rule to enforce',
      filename: '/repo/apps/api/src/reports.tsx',
      code: 'const a = <ul className="flex" />',
    },
  ],

  invalid: [
    {
      name: 'the main navigation, laid out with flex',
      filename: appShellFile('app/AppLayout.tsx'),
      code: 'const a = <ul className="flex items-center gap-1">{items}</ul>',
      errors: [{ messageId: 'missingListRole', data: { element: 'ul' } }],
    },
    {
      name: 'the saved views sidebar',
      filename: featureFile('savedViews/SavedViewsSidebar.tsx'),
      code: 'const a = <ul className="flex flex-col gap-1">{views}</ul>',
      errors: [{ messageId: 'missingListRole' }],
    },
    {
      name: "a ticket's move history, which is ordered and announced as prose",
      filename: featureFile('tickets/components/TicketHistoryCard.tsx'),
      code: 'const a = <ol className="flex flex-col gap-4">{moves}</ol>',
      errors: [{ messageId: 'missingListRole', data: { element: 'ol' } }],
    },
    {
      name: 'a spread is not a role: the semantic has to be visible where the element is',
      filename: featureFile(),
      code: 'const a = <ul {...props}>{rows}</ul>',
      errors: [{ messageId: 'missingListRole' }],
    },
    {
      name: 'the design system is in scope too, where a missing role goes unnoticed',
      filename: uiFile('components/List/List.tsx'),
      code: 'const a = <ul className="flex flex-col divide-y" />',
      errors: [{ messageId: 'missingListRole' }],
    },
    {
      name: 'a list with no classes at all is still reported — the rule does not read CSS',
      filename: featureFile(),
      code: 'const a = <ul>{rows}</ul>',
      errors: [{ messageId: 'missingListRole' }],
    },
  ],
})

describe('require-list-role message', () => {
  const message = rule.meta.messages.missingListRole

  it('names what to write, the primitive, and where it is imported from', () => {
    expect(message).toContain('role="list"')
    expect(message).toContain('List')
    expect(message).toContain('@support-desk/ui')
  })

  it('says what the defect costs, since nothing on screen shows it', () => {
    expect(message).toContain('semantics')
  })

  it('stays short and points at the README for the reasoning', () => {
    expect(message.length).toBeLessThan(280)
    expect(message).toContain('internal/eslint-plugin-harness/README.md')
  })
})
