/**
 * no-primitive-class-copying — a raw element wearing a primitive's class string.
 *
 * Why this rule exists
 * --------------------
 * Four separate components drew a card header or a card footer by hand rather
 * than importing `CardHeader` and `CardFooter` — `Modal`, `Drawer` and
 * `ReportToolbar` among them. Each was a `<div>` carrying the same border, the
 * same padding and the same flex row, retyped. Nothing was broken. Nothing could
 * be changed either, because changing the card scale meant finding four copies
 * and hoping that was all of them.
 *
 * The tell is the class string. `px-5 py-4` under a bottom border is a
 * `CardHeader`; `px-4 py-12 text-center` is a `StateMessage`. Those combinations
 * are not arrived at twice by chance, which is what makes them worth matching
 * on.
 *
 * This rule is a heuristic, and it is written to be honest about that
 * -----------------------------------------------------------------
 * It matches appearance, not intent, and appearance is not the whole story. A
 * toolbar is also a strip with a border across a card and is genuinely not a
 * `CardHeader`: a header says what a card is and pads to the card scale, a
 * toolbar acts on it and sits on the tighter `px-4 py-3` scale a table uses.
 * `TicketsToolbar` is that case and is correct as it stands.
 *
 * The rule therefore matches on the card scale rather than on "a strip with a
 * border", which is what keeps the toolbars out of it. Where it is still wrong,
 * the answer is usually that the classes are wrong rather than the markup — and
 * where it is not, a disable comment carrying the reason is a fair answer, and a
 * reviewable one.
 *
 * Matching is per string literal, deliberately. A copied class string arrives as
 * one literal, and unioning the branches of a conditional would invent
 * combinations nobody wrote.
 */

/**
 * The primitives worth recognising, most specific first.
 *
 * `CardBody` is last because its classes are a subset of `CardHeader`'s: a
 * header is a body plus a border and a flex row, so a string that is a header
 * would otherwise be reported as a body.
 */
const SIGNATURES = [
  {
    primitive: 'CardHeader',
    classes: ['border-b', 'border-border', 'px-5', 'py-4'],
  },
  {
    primitive: 'CardFooter',
    classes: ['border-t', 'border-border', 'px-5', 'py-3'],
  },
  {
    primitive: 'StateMessage',
    classes: ['px-4', 'py-12', 'text-center'],
  },
  {
    primitive: 'CardBody',
    classes: ['px-5', 'py-4'],
  },
]

/**
 * The files that define these primitives.
 *
 * They have to write the class strings — that is what a primitive is — so the
 * exemption lives here with the signatures rather than in `eslint.config.js`,
 * where it would read as a file someone had trouble with.
 */
const DEFINITIONS = [
  'packages/ui/src/components/Card/Card.tsx',
  'packages/ui/src/primitives/StateMessage/StateMessage.tsx',
]

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Import the primitive that owns a class combination rather than retyping it onto a raw element',
    },
    schema: [],
    // One or two sentences: what to use, where it lives, where the reasoning
    // is. The rest is in the docblock above and in the README, which are read
    // once. The heuristic warning stays, in its shortest useful form, because
    // it is what tells a reader a false positive is possible at all.
    messages: {
      copiedClasses:
        'Import {{primitive}} from @support-desk/ui instead of writing `{{classes}}` onto a ' +
        '`<{{element}}>`. This is a heuristic class match — a toolbar is a bordered strip and ' +
        'is not a CardHeader. See internal/eslint-plugin-harness/README.md.',
    },
  },

  create(context) {
    const filename = context.filename.replaceAll('\\', '/')

    if (DEFINITIONS.some((definition) => filename.endsWith(definition))) return {}

    return {
      JSXOpeningElement(node) {
        // Only raw elements. `<Card className="px-5 py-4">` is composition, and
        // `StatCard` is allowed to pad a `Card` to the card scale — that is the
        // scale, used by the thing it belongs to.
        if (!isHostElement(node.name)) return

        const element = node.name.name

        for (const literal of classStringsOf(node)) {
          const classes = new Set(literal.value.split(/\s+/).filter((token) => token !== ''))
          const match = SIGNATURES.find((signature) =>
            signature.classes.every((className) => classes.has(className)),
          )

          if (match === undefined) continue

          context.report({
            node: literal.node,
            messageId: 'copiedClasses',
            data: {
              primitive: match.primitive,
              element,
              classes: match.classes.join(' '),
            },
          })
        }
      },
    }
  },
}

/** `<div>` is a host element; `<Card>` and `<Icon.Foo>` are not. */
function isHostElement(name) {
  return name.type === 'JSXIdentifier' && /^[a-z]/.test(name.name)
}

/**
 * The static string chunks inside this element's `className`, one at a time.
 *
 * The attribute is nearly always `cn(...)` with the literals as arguments, so
 * this walks the expression rather than expecting a bare string.
 */
function classStringsOf(node) {
  const attribute = node.attributes.find(
    (candidate) =>
      candidate.type === 'JSXAttribute' &&
      candidate.name.type === 'JSXIdentifier' &&
      candidate.name.name === 'className',
  )

  if (attribute === undefined || attribute.value === null) return []

  const found = []

  walk(attribute.value, (child) => {
    if (child.type === 'Literal' && typeof child.value === 'string') {
      found.push({ node: child, value: child.value })
      return
    }

    if (child.type === 'TemplateElement') {
      found.push({ node: child, value: child.value.cooked ?? child.value.raw })
    }
  })

  return found
}

function walk(node, visit) {
  if (node === null || typeof node !== 'object') return

  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit)
    return
  }

  if (typeof node.type !== 'string') return

  visit(node)

  for (const [key, child] of Object.entries(node)) {
    if (key === 'parent' || key === 'loc' || key === 'range') continue
    walk(child, visit)
  }
}
