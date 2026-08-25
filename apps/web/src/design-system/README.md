# Design system

Everything the application renders is built from the primitives in this folder and
the tokens in `tokens.css`. There is no third-party component library, and there is
deliberately no lint rule enforcing any of what follows. These are the rules; holding
to them is a matter of reading them.

## Only semantic token classes

The Tailwind default palette has been removed. `tokens.css` clears the whole colour
namespace with `--color-*: initial` and then declares a semantic scale in its place:
`surface`, `border`, `fg`, `muted`, `primary`, `info`, `success`, `warning`, `danger`.

Write `bg-primary`, `text-fg-muted`, `border-border`. Never write `bg-blue-500`,
`text-gray-700`, or `border-slate-200` — those classes no longer exist, so they
produce no CSS at all. Nothing errors. The element simply renders unstyled, and it is
easy not to notice.

Each colour family follows the same shape, so you can predict the name you need:

| Token | Use |
| --- | --- |
| `primary` | solid fill for the strongest action |
| `primary-hover` | that fill on hover |
| `primary-fg` | text placed on top of the solid fill |
| `primary-subtle` | tinted background for badges and callouts |
| `primary-subtle-fg` | text on a tinted background |
| `primary-border` | border matching a tinted background |

If you need a colour that is not on the scale, add a token to `tokens.css` and give it
a semantic name. Do not reach around the scale with a hex value.

## Never hand-build a button

`<button className="...">` does not belong anywhere outside `Button/`. Use `Button`,
which owns the four variants (`primary`, `secondary`, `ghost`, `danger`), the two
sizes (`sm`, `md`), the focus ring, the disabled treatment, and the `type="button"`
default that stops a button inside a form from submitting it by accident.

The same applies to the other primitives. If a text field, a dropdown, a card, a
table, or a dialog is needed, it comes from this folder. When a primitive cannot do
what a screen needs, extend the primitive — do not build a parallel one next to it.

## Badge statuses come from a fixed union

`BadgeStatus` is `'neutral' | 'info' | 'success' | 'warning' | 'danger'` and nothing
else. The style table in `Badge.tsx` is keyed by that union, so adding a status
without styling it is a compile error rather than a silently unstyled badge.

Those five values are *presentation* states. They are not ticket statuses. A ticket's
`status` and `priority` are domain values — configuration an admin edits, in fact, so
which ones exist is not known until the taxonomy loads. Mapping one onto a badge
appearance belongs in the feature layer: `features/taxonomy/appearance.ts` holds the
table, and `TicketStatusBadge` reads it. The two unions happen to use the same five
words, and that table is what keeps it a coincidence rather than a dependency. The
design system must not learn what a ticket is.

## No arbitrary values

Do not write `w-[437px]`, `mt-[13px]`, or `text-[13.5px]`. Spacing is a multiple of the
`--spacing` base, so `p-2`, `gap-6`, and `mt-10` are all on the scale. Radii come from
`rounded-sm|md|lg|xl`, type from `text-xs` through `text-2xl`, and elevation from
`shadow-card` and `shadow-overlay`.

An arbitrary value is a sign that either the design is off-grid or the scale is
missing a step. Both are worth resolving before the class is written.

## Interactive elements carry their accessible attributes

- Every form control has a real `<label>` bound to it. `Input`, `Select`, and
  `Textarea` take a required `label` prop and generate their own `id` with `useId`,
  which is why they omit `id` from their props — the binding cannot be forgotten.
  A field in a table row, where the column header already names it on screen, passes
  `labelHidden` on `Input` or `Select`: the label is rendered `sr-only` and stays the
  control's accessible name. It is never a way to have no label, and the name should
  still say which row it belongs to — `Label for open`, not `Label`.
- Errors set `aria-invalid` and are wired to the control through `aria-describedby`.
  Pass the `error` prop rather than rendering error text alongside the field.
- Icon-only controls need an `aria-label`.
- `Table` requires a `caption` and renders it visually hidden; header cells carry
  `scope="col"`.
- `Modal` is a real dialog: `role="dialog"`, `aria-modal`, an accessible name from its
  title, Escape to dismiss, and focus moved in on open and restored on close.
- Loading and empty states belong to `TableBody` via `isLoading` and `isEmpty`, so
  that the loading message is announced through `role="status"` in every table rather
  than in whichever ones remembered to do it.

## Composing classes

Every primitive merges class names through `cn()` from `src/lib/cn.ts`, which is clsx
plus tailwind-merge. The incoming `className` is always merged last so a caller can
override a default without an `!important` or a specificity fight.

```tsx
className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
```

Use `cn()` in every new component, in that order.
