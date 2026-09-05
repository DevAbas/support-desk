import { describe, expect, it } from 'vitest'
import rule from '../rules/aria-modal-needs-focus-trap.js'
import { createRuleTester, featureFile, uiFile } from './ruleTester.js'

const ruleTester = createRuleTester()

ruleTester.run('aria-modal-needs-focus-trap', rule, {
  valid: [
    {
      name: 'Dialog, which is the one file in the codebase that carries the attribute',
      filename: uiFile('components/Dialog/Dialog.tsx'),
      code: [
        "import { useFocusTrap } from './useFocusTrap'",
        'export function Dialog({ open, onClose }) {',
        '  useFocusTrap(panelRef, open)',
        '  return <div role="dialog" aria-modal="true" tabIndex={-1} />',
        '}',
      ].join('\n'),
    },
    {
      name: 'a component that renders Dialog rather than the attribute',
      filename: uiFile('components/Modal/Modal.tsx'),
      code: 'const a = <Dialog open={open} onClose={onClose} title={title} />',
    },
    {
      name: 'no dialog at all',
      filename: featureFile(),
      code: 'const a = <section aria-label="Filters" />',
    },
    {
      name: 'aria-modal={false}, which claims nothing',
      filename: featureFile(),
      code: 'const a = <div role="dialog" aria-modal={false} />',
    },
    {
      name: 'aria-modal="false", the same claim spelled as a string',
      filename: featureFile(),
      code: 'const a = <div role="dialog" aria-modal="false" />',
    },
    {
      // The limitation the docblock admits to, pinned so it cannot be tightened
      // by accident and cannot be forgotten: the check is per file, not per
      // element. Following a ref from an attribute to a hook call is a data-flow
      // question this pass cannot answer, so naming the hook anywhere is enough.
      name: 'the hook named but not called — the check is per file, not per element',
      filename: uiFile('components/Dialog/Dialog.tsx'),
      code: ['const useFocusTrap = null', 'const a = <div aria-modal="true" />'].join('\n'),
    },
  ],

  invalid: [
    {
      name: 'the attribute Modal carried before it was collapsed onto Dialog',
      filename: uiFile('components/Modal/Modal.tsx'),
      code: 'const a = <div role="dialog" aria-modal="true">{children}</div>',
      errors: [{ messageId: 'unbackedAriaModal' }],
    },
    {
      name: 'the same in Drawer, where it was written a second time',
      filename: uiFile('components/Drawer/Drawer.tsx'),
      code: 'const a = <aside role="dialog" aria-modal="true">{children}</aside>',
      errors: [{ messageId: 'unbackedAriaModal' }],
    },
    {
      name: 'a feature reaching for the attribute instead of the primitive',
      filename: featureFile('customers/components/CustomerDrawer.tsx'),
      code: 'const a = <div aria-modal="true" className="fixed inset-y-0" />',
      errors: [{ messageId: 'unbackedAriaModal' }],
    },
    {
      name: 'escaping the trap and keeping the claim, reported per element',
      filename: uiFile('components/CommandPalette/CommandPalette.tsx'),
      code: [
        'const a = <div aria-modal="true" />',
        'const b = <div aria-modal={true} />',
      ].join('\n'),
      errors: [{ messageId: 'unbackedAriaModal' }, { messageId: 'unbackedAriaModal' }],
    },
  ],
})

describe('aria-modal-needs-focus-trap', () => {
  const message = rule.meta.messages.unbackedAriaModal

  it('names the primitives and the hook, and where they are imported from', () => {
    expect(message).toContain('Dialog')
    expect(message).toContain('useFocusTrap')
    expect(message).toContain('@support-desk/ui')
  })

  it('says what goes wrong, since nothing on screen does', () => {
    expect(message).toContain('Tab')
  })

  it('stays short and points at the README for the reasoning', () => {
    expect(message.length).toBeLessThan(280)
    expect(message).toContain('internal/eslint-plugin-harness/README.md')
  })
})
