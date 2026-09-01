import { describe, expect, it } from 'vitest'
import rule, { EXEMPTIONS } from '../rules/no-raw-type-classes.js'
import { appShellFile, createRuleTester, featureFile, uiFile } from './ruleTester.js'

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
      name: 'outside the scope: the api renders nothing, so a text- string is a string',
      filename: '/repo/apps/api/src/app.ts',
      code: "const a = { size: 'text-sm' }",
    },
    {
      name: 'outside the scope: shared holds the contract, not appearance',
      filename: '/repo/packages/shared/src/cn.ts',
      code: "const semanticTextSizes = ['title', 'section', 'text-sm']",
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
      /*
       * The scope used to stop at `apps/web/src/features`, and this was a valid
       * case on the grounds that the app shell is not feature code. It is app
       * code, it renders, and this is the exact line the old scope missed: the
       * wordmark in `AppLayout`, a level reassembled out of a size and a weight.
       */
      name: 'the app shell is in scope: a hand-assembled level in AppLayout',
      filename: appShellFile(),
      code: 'const a = <span className="text-base font-semibold text-fg">Support Desk</span>',
      errors: [{ messageId: 'rawSize' }, { messageId: 'rawWeight' }],
    },
    {
      name: 'the whole of apps/web/src, not only the two directories that had defects',
      filename: appShellFile('test/renderWithProviders.tsx'),
      code: "const wrapper = <div className=\"text-lg\" />",
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
      expect(message).toContain('@support-desk/ui')
      expect(message).toMatch(/text-title|text-section/)
      expect(message).toContain('{{className}}')
    }
  })

  it('stay short and point at the README for the reasoning', () => {
    // Ten violations when the cap was written, so ten copies of whatever is
    // written here in every lint run. The count is zero now; the cap stays,
    // because it is the next ten that it is for.
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
