import { describe, expect, it } from 'vitest'
import rule from '../rules/no-primitive-class-copying.js'
import { createRuleTester, featureFile, uiFile } from './ruleTester.js'

const ruleTester = createRuleTester()

const CARD_HEADER = 'flex items-start justify-between gap-4 border-b border-border px-5 py-4'
const CARD_FOOTER = 'flex items-center justify-end gap-2 border-t border-border bg-surface-muted px-5 py-3'
const STATE_MESSAGE = 'px-4 py-12 text-center text-body text-fg-muted'

/** What each message names back: the primitive, the element, and the match. */
const HEADER_MATCH = 'border-b border-border px-5 py-4'
const FOOTER_MATCH = 'border-t border-border px-5 py-3'
const STATE_MATCH = 'px-4 py-12 text-center'

ruleTester.run('no-primitive-class-copying', rule, {
  valid: [
    {
      name: 'importing the primitive, which is the fix',
      filename: featureFile(),
      code: 'const a = <CardHeader title="Tickets" actions={<Button>New</Button>} />',
    },
    {
      name: 'a component padded to the card scale is composition, not a copy',
      filename: uiFile('components/StatCard/StatCard.tsx'),
      code: "const a = <Card className={cn('flex flex-col gap-2 px-5 py-4', className)} />",
    },
    {
      name: 'a toolbar: a bordered strip on the tighter table scale, and not a CardHeader',
      filename: featureFile('tickets/components/TicketsToolbar.tsx'),
      code: 'const a = <div className="flex flex-wrap items-center justify-end gap-4 border-b border-border px-4 py-3" />',
    },
    {
      name: 'pagination: a bordered footer strip, also on the table scale',
      filename: featureFile('tickets/components/Pagination.tsx'),
      code: 'const a = <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-3" />',
    },
    {
      name: 'the file that defines Card is allowed to write Card’s classes',
      filename: '/repo/packages/ui/src/components/Card/Card.tsx',
      code: `const a = <div className={cn('${CARD_HEADER}', className)} />`,
    },
    {
      name: 'and so is the file that defines StateMessage',
      filename: '/repo/packages/ui/src/primitives/StateMessage/StateMessage.tsx',
      code: `const baseClasses = '${STATE_MESSAGE}'`,
    },
    {
      name: 'a partial match is not a match',
      filename: featureFile(),
      code: 'const a = <div className="border-b border-border px-4 py-4" />',
    },
  ],

  invalid: [
    {
      name: 'a hand-built card header, which four components had',
      filename: uiFile('components/Modal/Modal.tsx'),
      code: `const a = <div className="${CARD_HEADER}" />`,
      errors: [
        {
          messageId: 'copiedClasses',
          data: { primitive: 'CardHeader', element: 'div', classes: HEADER_MATCH },
        },
      ],
    },
    {
      name: 'a hand-built card footer, behind cn()',
      filename: uiFile('components/Drawer/Drawer.tsx'),
      code: `const a = <div className={cn('${CARD_FOOTER}', className)} />`,
      errors: [
        {
          messageId: 'copiedClasses',
          data: { primitive: 'CardFooter', element: 'div', classes: FOOTER_MATCH },
        },
      ],
    },
    {
      name: 'a hand-built empty state, which is the one that forgets the live region',
      filename: featureFile('reports/components/ReportBreakdownChart.tsx'),
      code: `const a = <div className="${STATE_MESSAGE}">Nothing to show.</div>`,
      errors: [
        {
          messageId: 'copiedClasses',
          data: { primitive: 'StateMessage', element: 'div', classes: STATE_MATCH },
        },
      ],
    },
    {
      name: 'a hand-built card body on a section element',
      filename: featureFile(),
      code: 'const a = <section className="px-5 py-4">{children}</section>',
      errors: [
        {
          messageId: 'copiedClasses',
          data: { primitive: 'CardBody', element: 'section', classes: 'px-5 py-4' },
        },
      ],
    },
    {
      name: 'a header reports as a header rather than as the body it contains',
      filename: featureFile(),
      code: `const a = <header className="${CARD_HEADER}" />`,
      errors: [
        {
          messageId: 'copiedClasses',
          data: { primitive: 'CardHeader', element: 'header', classes: HEADER_MATCH },
        },
      ],
    },
    {
      name: 'a conditional branch is still a copied string',
      filename: featureFile(),
      code: `const a = <div className={cn(isOpen && '${CARD_HEADER}')} />`,
      errors: [
        {
          messageId: 'copiedClasses',
          data: { primitive: 'CardHeader', element: 'div', classes: HEADER_MATCH },
        },
      ],
    },
  ],
})

describe('no-primitive-class-copying message', () => {
  const message = rule.meta.messages.copiedClasses

  it('names the primitive, the import path, and its own fallibility', () => {
    expect(message).toContain('@support-desk/ui')
    expect(message).toContain('{{primitive}}')
    expect(message).toContain('heuristic')
    // The rule is wrong about toolbars often enough that the message has to say
    // so even in its shortest form, or the reader has no way to tell a false
    // positive from a real one.
    expect(message).toContain('toolbar')
  })

  it('stays short and points at the README for the reasoning', () => {
    expect(message.length).toBeLessThan(280)
    expect(message).toContain('internal/eslint-plugin-harness/README.md')
  })
})
