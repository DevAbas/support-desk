import { describe, expect, it } from 'vitest'
import rule from '../rules/no-glyph-icons.js'
import { createRuleTester, featureFile } from './ruleTester.js'

const ruleTester = createRuleTester()

ruleTester.run('no-glyph-icons', rule, {
  valid: [
    {
      name: 'plain ASCII text',
      filename: featureFile(),
      code: 'const a = <p>Back to tickets</p>',
    },
    {
      name: 'the Icon primitive, which is the fix',
      filename: featureFile(),
      code: 'const a = <button type="button" aria-label="Close"><Icon name="close" label="Close" decorative /></button>',
    },
    {
      name: 'an ellipsis inside a string literal — prose, not an icon',
      filename: featureFile(),
      code: "const a = <StateMessage isLoading>{'Loading customer…'}</StateMessage>",
    },
    {
      name: 'a template literal, which is also a string',
      filename: featureFile(),
      code: 'const a = <p>{`${company} · ${email}`}</p>',
    },
    {
      name: 'an attribute, so copy in other languages is unaffected',
      filename: featureFile(),
      code: 'const a = <img src={src} alt="Portrait de Chloé Ménard" />',
    },
    {
      name: 'a non-ASCII string constant outside JSX',
      filename: featureFile(),
      code: "export const LOADING_MESSAGE = 'Chargement…'",
    },
  ],

  invalid: [
    {
      name: 'the close cross that was written into Modal and Drawer',
      filename: featureFile(),
      code: 'const a = <button type="button" onClick={onClose}>×</button>',
      errors: [{ messageId: 'glyphInJsxText' }],
    },
    {
      name: 'the same cross written as an HTML entity',
      filename: featureFile(),
      code: 'const a = <button type="button" onClick={onClose}>&#215;</button>',
      errors: [{ messageId: 'glyphInJsxText' }],
    },
    {
      name: 'the pencil in the saved views sidebar',
      filename: featureFile('tickets/components/SavedViewsSidebar.tsx'),
      code: 'const a = <button type="button" onClick={onRename}>✎</button>',
      errors: [{ messageId: 'glyphInJsxText' }],
    },
    {
      name: "StatCard's three arrows, reported one apiece",
      filename: featureFile(),
      code: 'const a = <span>↑ ↓ →</span>',
      errors: [
        { messageId: 'glyphInJsxText' },
        { messageId: 'glyphInJsxText' },
        { messageId: 'glyphInJsxText' },
      ],
    },
    {
      name: 'an arrow inside link text, which a screen reader reads as a word',
      filename: featureFile(),
      code: 'const a = <Link to="/tickets">← Back to tickets</Link>',
      errors: [{ messageId: 'glyphInJsxText' }],
    },
    {
      name: 'an emoji, which is one glyph and not two halves of a surrogate pair',
      filename: featureFile(),
      code: 'const a = <span>🔔</span>',
      errors: [{ messageId: 'glyphInJsxText' }],
    },
  ],
})

describe('no-glyph-icons message', () => {
  const message = rule.meta.messages.glyphInJsxText

  it('names the replacement, where it is imported from, and the escape hatch', () => {
    expect(message).toContain('Icon')
    expect(message).toContain('@support-desk/ui')
    expect(message).toContain('string literal')
  })

  it('stays short and points at the README for the reasoning', () => {
    // A message is read once per violation; the reasoning is read once. The
    // cap is here because the first version of this rule printed a paragraph
    // and a lint run of ten violations was unreadable.
    expect(message.length).toBeLessThan(280)
    expect(message).toContain('internal/eslint-plugin-harness/README.md')
  })
})
