/**
 * require-list-role — a list element whose own CSS has taken its list semantics away.
 *
 * Why this rule exists
 * --------------------
 * `packages/ui/README.md` already states this rule, in prose, and states it only
 * about one component:
 *
 *   "`List` … also sets `role="list"` explicitly, because taking the bullets off
 *   takes the list semantics with them in some browsers."
 *
 * `List` does set it, at two places in `List.tsx`, with the reason written beside
 * them. And four hand-written lists in `apps/web` do not, every one of them
 * carrying a `flex` class that does exactly what the README describes:
 *
 *   app/AppLayout.tsx                             the main navigation
 *   features/savedViews/SavedViewsSidebar.tsx     the saved views
 *   features/tickets/components/CommentList.tsx   the comments
 *   features/tickets/components/TicketHistoryCard.tsx  the move history
 *
 * `display: flex` on a `<ul>` takes the same semantics off in the same browsers
 * that `list-style: none` does; the README's sentence is about the bullets
 * because that is how it was hit first. So the app's navigation announces itself
 * as four unrelated links rather than a list of four, and a ticket's history
 * announces as loose paragraphs rather than an ordered list of moves. Nothing
 * renders wrong, nothing type-checks wrong, and a screenshot shows nothing.
 *
 * The design system's own answer is `List`, which requires a `label` as well, and
 * is what feature code should reach for. Where a `<ul>` is genuinely the right
 * element — a `<nav>`'s own list is not a `List` — the attribute is one word.
 *
 * This is the rule the README wrote down and nothing enforced. Prose stated for
 * one component does not travel to the four places that never imported it.
 *
 * Known limitations
 * -----------------
 * **It requires the attribute to be written literally.** `<ul {...props}>` where
 * `props` carries a role is reported, and the fix is to write `role="list"`
 * anyway. That is deliberate rather than a gap: the whole defect is a semantic
 * that is not visible where the element is, and a role arriving through a spread
 * is not visible either.
 *
 * **Any explicit `role` satisfies it.** `role="listbox"`, `role="menu"`,
 * `role="none"` and `role="presentation"` all pass, because writing one of those
 * on a `<ul>` is a decision somebody made. The rule catches the absence of a
 * decision, not a wrong one.
 *
 * **It does not read CSS.** A `<ul>` with default list styling does not need the
 * attribute, and is reported anyway. Telling the two apart means resolving
 * Tailwind classes through a theme at lint time; requiring the word everywhere
 * costs one attribute and needs no such machinery.
 *
 * **It does not check the list has a name**, which `List` requires and which
 * sixty unattributed rows need as much as they need the role. `aria-label` on a
 * `<nav>` above the list often supplies it, and the rule cannot see that.
 */

const LIST_ELEMENTS = new Set(['ul', 'ol'])

/** Where lists are rendered. `apps/api` and `packages/shared` render nothing. */
const SCOPES = ['apps/web/src/', 'packages/ui/src/']

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Give a list element an explicit role, which its own layout CSS removes',
    },
    schema: [],
    // One or two sentences: what to write, what it costs, where the reasoning
    // is. The rest is in the docblock above and in the README.
    messages: {
      missingListRole:
        'Write role="list" on this <{{element}}>, or render List from @support-desk/ui. Laying a ' +
        'list out with flex takes its list semantics away in some browsers, exactly as removing ' +
        'the bullets does. See internal/eslint-plugin-harness/README.md.',
    },
  },

  create(context) {
    const filename = context.filename.replaceAll('\\', '/')

    if (!SCOPES.some((scope) => filename.includes(scope))) return {}

    return {
      JSXOpeningElement(node) {
        if (node.name.type !== 'JSXIdentifier') return
        if (!LIST_ELEMENTS.has(node.name.name)) return
        if (hasLiteralRole(node)) return

        context.report({
          node,
          messageId: 'missingListRole',
          data: { element: node.name.name },
        })
      },
    }
  },
}

/** A `role` written on the element itself, whatever it says. */
function hasLiteralRole(node) {
  return node.attributes.some(
    (attribute) =>
      attribute.type === 'JSXAttribute' &&
      attribute.name.type === 'JSXIdentifier' &&
      attribute.name.name === 'role',
  )
}
