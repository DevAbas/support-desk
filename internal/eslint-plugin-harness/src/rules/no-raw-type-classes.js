/**
 * no-raw-type-classes — a raw Tailwind size or weight where a semantic level belongs.
 *
 * Why this rule exists
 * --------------------
 * Six screens hand-built their own page title before `Heading` existed, and
 * they did it the same way each time: `text-2xl font-semibold text-fg`, three
 * classes reassembled from scratch at every call site. A seventh invented a
 * level of its own. Nothing was broken and nothing could be restyled, because
 * there was no name for the thing being restyled.
 *
 * `tokens.css` names the type the way it names the colours. `text-title` is the
 * one heading at the top of a screen, `text-section` the heading on a card or a
 * dialog, `text-subsection` a heading on a group inside one, and prose is
 * `text-body` with `text-caption` under it for meta. Each carries its own line
 * height, and the three headings carry their weight — which is why a heading
 * never also needs `font-semibold`.
 *
 * Scope and exemptions
 * --------------------
 * Feature code — `apps/web/src/features` — is where the copies were written, and
 * it has no reason to reach past the semantic layer.
 *
 * `packages/ui` is also in scope, because it is where a raw size would go
 * unnoticed, but it is where the semantic layer is *built*, so a raw class is
 * sometimes right there: it is right wherever the class sizes something that is
 * not type. Those cases are named in EXEMPTIONS below rather than in
 * `eslint.config.js`, so that the reason travels with the rule and a new one has
 * to be argued for in a diff to this file.
 */

/** Variant prefixes (`md:`, `hover:`) and `!` are noise; the class is what matters. */
function bareClass(token) {
  const withoutVariants = token.slice(token.lastIndexOf(':') + 1)

  return withoutVariants.startsWith('!') ? withoutVariants.slice(1) : withoutVariants
}

const RAW_SIZES = new Set(['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl'])

const RAW_WEIGHT = 'font-semibold'

const FEATURE_SCOPE = 'apps/web/src/features/'

const UI_SCOPE = 'packages/ui/src/'

/**
 * Where a raw class in `packages/ui` is the right answer, and why.
 *
 * Each entry is the narrowest thing that works: one file, and only the classes
 * that file has a reason for. A new raw size in an exempted file is still a
 * violation.
 */
const EXEMPTIONS = [
  {
    file: 'packages/ui/src/primitives/Avatar/Avatar.tsx',
    classes: ['text-xs', 'text-sm', 'text-lg'],
    // Initials are not type. They are a mark inside a circle of a fixed size,
    // and they scale with the circle — `size-8` takes `text-xs`, `size-14`
    // takes `text-lg`. A semantic level here would tie the mark to the prose
    // scale and break the fit at two of the three sizes.
    reason: 'the initials are sized to the circle they sit in, not to the type around them',
  },
  {
    file: 'packages/ui/src/components/Table/Table.tsx',
    classes: [RAW_WEIGHT],
    // `text-caption` deliberately carries no weight: only the three heading
    // levels do. A column header is a label rather than a heading, so the
    // weight is added on top of the semantic size instead of replacing it.
    reason: 'a column header is a label, and text-caption carries no weight of its own',
  },
]

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Use the semantic type scale rather than raw Tailwind size and weight classes',
    },
    schema: [],
    // One or two sentences: what to use, where it lives, where the reasoning
    // is. The rest is in the docblock above and in the README, which are read
    // once — a message is read once per violation, and there are ten of these.
    messages: {
      rawSize:
        'Use a semantic type level instead of `{{className}}`: text-title, text-section, ' +
        'text-subsection, text-body, text-caption — or render Heading or Text from ' +
        '@harness-sample/ui. See internal/eslint-plugin-harness/README.md.',
      rawWeight:
        'Drop `{{className}}` and take the weight from a heading level — text-title, ' +
        'text-section, text-subsection — or render Heading from @harness-sample/ui. ' +
        'See internal/eslint-plugin-harness/README.md.',
    },
  },

  create(context) {
    const filename = context.filename.replaceAll('\\', '/')
    const allowed = allowedIn(filename)

    if (allowed === null) return {}

    function check(node, value) {
      if (typeof value !== 'string') return

      for (const token of value.split(/\s+/)) {
        const className = bareClass(token)

        if (allowed.has(className)) continue

        if (RAW_SIZES.has(className)) {
          context.report({ node, messageId: 'rawSize', data: { className } })
        } else if (className === RAW_WEIGHT) {
          context.report({ node, messageId: 'rawWeight', data: { className } })
        }
      }
    }

    // Class strings are read wherever they are written, not only on a
    // `className`: every primitive in this codebase keeps its variants in a
    // module-level `Record<Union, string>` above the component, and that table
    // is exactly where a raw size hides.
    return {
      Literal(node) {
        check(node, node.value)
      },
      TemplateElement(node) {
        check(node, node.value.cooked ?? node.value.raw)
      },
    }
  },
}

/**
 * The classes this file may use, or `null` when the file is out of scope.
 *
 * An empty set means "in scope, nothing exempted", which is every file in
 * `apps/web/src/features`.
 */
function allowedIn(filename) {
  const inScope = filename.includes(FEATURE_SCOPE) || filename.includes(UI_SCOPE)

  if (!inScope) return null

  const allowed = new Set()

  for (const exemption of EXEMPTIONS) {
    if (filename.endsWith(exemption.file)) {
      for (const className of exemption.classes) allowed.add(className)
    }
  }

  return allowed
}

export { EXEMPTIONS }
