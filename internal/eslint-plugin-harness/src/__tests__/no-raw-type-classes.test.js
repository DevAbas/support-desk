import { describe, expect, it } from 'vitest'
import rule, { EXEMPTIONS } from '../rules/no-raw-type-classes.js'
import { createRuleTester, featureFile, uiFile } from './ruleTester.js'

const ruleTester = createRuleTester()

const AVATAR = uiFile('primitives/Avatar/Avatar.tsx')
const TABLE = uiFile('components/Table/Table.tsx')

ruleTester.run('no-raw-type-classes', rule, {
  valid: [
    {
      name: 'the semantic scale, which is the point',
      filename: featureFile(),
      code: 'const a = <h1 className="text-title text-fg">Tickets</h1>',
    },
    {
      name: 'the primitive that owns the scale',
      filename: featureFile(),
      code: 'const a = <Heading level="page">Tickets</Heading>',
    },
    {
      name: 'a colour token that only looks like a size',
      filename: featureFile(),
      code: 'const a = <p className="text-fg-muted text-caption">3 open</p>',
    },
    {
      name: 'outside the scope: shared, api and the app shell are not feature code',
      filename: '/repo/apps/web/src/app/AppLayout.tsx',
      code: 'const a = <span className="text-sm">Harness</span>',
    },

    /*
     * The two exemptions. Both are in `packages/ui`, both are a raw class doing
     * something the semantic scale does not cover, and both are declared in the
     * rule source rather than in eslint.config.js.
     */
    {
      name: "exempt: Avatar's initials are sized to the circle, not to the type",
      filename: AVATAR,
      code: "const sizeClasses = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-14 text-lg' }",
    },
    {
      name: 'exempt: a column header is a label, and text-caption carries no weight',
      filename: TABLE,
      code: 'const a = <th className="px-4 py-3 text-caption font-semibold uppercase" />',
    },
  ],

  invalid: [
    {
      name: 'the hand-built page title, six screens deep',
      filename: featureFile(),
      code: 'const a = <h1 className="text-2xl font-semibold text-fg">Tickets</h1>',
      errors: [{ messageId: 'rawSize' }, { messageId: 'rawWeight' }],
    },
    {
      name: 'a raw size on meta text',
      filename: featureFile('tickets/components/CommentList.tsx'),
      code: 'const a = <p className="text-xs text-fg-subtle">{formatDate(comment.createdAt)}</p>',
      errors: [{ messageId: 'rawSize', data: { className: 'text-xs' } }],
    },
    {
      name: 'a weight on its own',
      filename: featureFile('reports/components/ReportAssigneeTable.tsx'),
      code: 'const a = <td className="font-semibold">{row.total}</td>',
      errors: [{ messageId: 'rawWeight' }],
    },
    {
      name: 'a variant prefix does not hide the class',
      filename: featureFile(),
      code: 'const a = <p className="text-body md:text-lg hover:!text-sm" />',
      errors: [{ messageId: 'rawSize' }, { messageId: 'rawSize' }],
    },
    {
      name: 'a class table above the component, which is where sizes hide',
      filename: featureFile(),
      code: "const sizeClasses = { small: 'text-sm', large: 'text-xl' }",
      errors: [{ messageId: 'rawSize' }, { messageId: 'rawSize' }],
    },
    {
      name: 'a template literal chunk',
      filename: featureFile(),
      code: 'const a = <p className={`text-base ${tone}`} />',
      errors: [{ messageId: 'rawSize' }],
    },
    {
      name: 'packages/ui is in scope too, outside the exempted files',
      filename: uiFile('components/Modal/Modal.tsx'),
      code: 'const a = <h2 className="text-lg font-semibold">{title}</h2>',
      errors: [{ messageId: 'rawSize' }, { messageId: 'rawWeight' }],
    },
    {
      name: 'an exemption covers only the classes it names: text-2xl in Avatar still fails',
      filename: AVATAR,
      code: "const sizeClasses = { xl: 'size-20 text-2xl' }",
      errors: [{ messageId: 'rawSize', data: { className: 'text-2xl' } }],
    },
    {
      name: 'an exemption covers only the file it names: font-semibold outside Table still fails',
      filename: uiFile('components/List/List.tsx'),
      code: 'const a = <p className="text-caption font-semibold" />',
      errors: [{ messageId: 'rawWeight' }],
    },
  ],
})

describe('no-raw-type-classes messages', () => {
  it('name the semantic scale and where the primitives are imported from', () => {
    for (const message of Object.values(rule.meta.messages)) {
      expect(message).toContain('@harness-sample/ui')
      expect(message).toMatch(/text-title|text-section/)
      expect(message).toContain('{{className}}')
    }
  })

  it('stay short and point at the README for the reasoning', () => {
    // Ten violations of this rule in the repository today, so ten copies of
    // whatever is written here in every lint run.
    for (const message of Object.values(rule.meta.messages)) {
      expect(message.length).toBeLessThan(280)
      expect(message).toContain('internal/eslint-plugin-harness/README.md')
    }
  })
})

describe('exemptions', () => {
  it('each names a file, the classes it covers, and why', () => {
    expect(EXEMPTIONS.length).toBeGreaterThan(0)

    for (const exemption of EXEMPTIONS) {
      expect(exemption.file).toMatch(/^packages\/ui\/src\//)
      expect(exemption.classes.length).toBeGreaterThan(0)
      expect(exemption.reason.length).toBeGreaterThan(20)
    }
  })
})
