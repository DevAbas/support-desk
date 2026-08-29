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
table, a list, or a dialog is needed, it comes from this folder. When a primitive
cannot do what a screen needs, extend the primitive — do not build a parallel one
next to it.

`ListRow` is the case worth reading. A dense row is a small target and the useful
target is all of it, so a selectable row is one wide control — and that control is
`Button` with its height and radius overridden, not a `<button>` written next to
`Button/`. `Tab` is built the same way. Everything a control has to get right, from
the focus ring to the `type="button"` default, is got right once.

## The charting library stays behind `Chart/`

`Chart/` is the only place in this codebase that imports the charting library. Feature
code hands it `ChartDatum[]` and reads nothing of the library's API, so replacing the
library is a change to one component rather than to every screen that draws something.

A charting library ships its own palette, and a chart drawn in it is the one thing on
the page that does not belong to this design system. Marks take their fill from the
token custom properties — `var(--color-success)`, never `#16a34a` and never the
library's fourth default colour — and so do the grid, the axis and the tooltip. A chart
that needs a colour gets it from `tokens.css` like everything else.

A chart is also a picture, which is no use to anyone who cannot see it. `BarChart` hides
the drawing from assistive technology and renders the same figures beside it as a
`Table`, visually hidden. That is not a nicety: it is also what makes the neutral tone
legible, because a grey mark sits below the contrast a shape needs to carry meaning on
its own, so every bar is labelled with its value and every value is in the table.

## Two primitives that look alike are not the same primitive

`Table` and `List` both draw rows. `Modal` and `Drawer` both open over the page.
Neither pair is one component with a prop, and adding that prop is the wrong fix
each time.

A **table** is a grid. It has columns, every row answers the same questions in the
same order, and a header says what those questions are; it is read across. A **list**
has a shape instead — something to lead with, a line, a quieter line under it — and
it is scanned down. `List` therefore takes a `label` where `Table` takes a `caption`,
and `ListRow` takes `leading`, `title`, `subtitle`, `meta` and `trailing` rather than
cells. The two patterns are both in this repo on purpose: `features/tickets` is a
table and `features/customers` is a list, and neither is the one that got it wrong.

`Select` and `MultiSelect` are the third pair, and `multiple` is the prop that would
have been wrong. A native multiple select is a scrolling box that has to be
ctrl-clicked to add to, which almost nobody discovers, and it cannot say "3 selected"
without a second element beside it saying so. `MultiSelect` is a group of checkboxes
behind a disclosure, because choosing several things out of a list is what a group of
checkboxes is for.

The difference reaches the domain, too. A single-value filter has to widen its union
with an `'all'` member to say "do not filter on this" — see `statusFilterSchema` in the
shared contract. A set already has a way to say it, and it is the empty set. Do not add
an "All" option to a `MultiSelect`; it would be a second thing that means what `[]`
already means.

A **modal** interrupts. It asks a question and does not go away until it is answered.
A **drawer** accompanies: the list it slid over is still the thing being worked
through, and it is expected to be opened and closed a dozen times against it. They
share the dialog contract deliberately — the same `role="dialog"`, the same
accessible name from the title, the same Escape, the same focus moved in on open and
restored to the trigger on close — because those are the parts a person relies on,
and two dialogs that dismiss differently is a bug in one of them. What differs is
placement and purpose, which is not a size prop.

## Badge statuses come from a fixed union

`BadgeStatus` is `'neutral' | 'info' | 'success' | 'warning' | 'danger'` and nothing
else. The style table in `Badge.tsx` is keyed by that union, so adding a status
without styling it is a compile error rather than a silently unstyled badge.

Those five values are *presentation* states. They are not ticket statuses. A ticket's
`status` and `priority` are domain values, and mapping them onto a badge appearance
belongs in the feature layer — see `apps/web/src/features/tickets/components/TicketStatusBadge.tsx`.
The design system must not learn what a ticket is.

`Avatar` is the exception that proves it. Its tone is not a prop at all: it is derived
from the name, so that the same person is the same colour on every screen. That is
allowed precisely because it means *nothing* — a customer is not in trouble because
their initials came out red. A tone that carries meaning is the feature's to choose; a
tone that carries none can be computed.

`AlertTone`, `ChartTone` and `StatChangeIntent` are the same kind of union and carry the
same rule. A bar is not green because it is resolved; it is green because the feature
decided that resolved is drawn in the success tone, in
`apps/web/src/features/reports/reportViews.ts`. `StatCard` is the clearest case: it is handed a
direction *and* an intent, because only the screen knows that more tickets raised is bad
news and more resolved is good, while the arrow for both points the same way.

## No arbitrary values

Do not write `w-[437px]`, `mt-[13px]`, or `text-[13.5px]`. Spacing is a multiple of the
`--spacing` base, so `p-2`, `gap-6`, and `mt-10` are all on the scale. Radii come from
`rounded-sm|md|lg|xl`, type from `text-xs` through `text-2xl`, and elevation from
`shadow-card` and `shadow-overlay`.

An arbitrary value is a sign that either the design is off-grid or the scale is
missing a step. Both are worth resolving before the class is written.

Motion is on a scale too — `--animate-fade-in`, `--animate-slide-in-right` — and it is
short. `Drawer` is the only thing in the app that moves, and it moves because a panel
that slides in from an edge says where it came from, and so where it will go back to.
Anything animated pairs its class with `motion-reduce:animate-none`: a preference for
less motion is not a preference for a panel that never appears.

## Interactive elements carry their accessible attributes

- Every form control has a real `<label>` bound to it. `Input`, `Select`, and
  `Textarea` take a required `label` prop and generate their own `id` with `useId`,
  which is why they omit `id` from their props — the binding cannot be forgotten.
- Errors set `aria-invalid` and are wired to the control through `aria-describedby`.
  Pass the `error` prop rather than rendering error text alongside the field.
- Icon-only controls need an `aria-label`.
- `Table` requires a `caption` and renders it visually hidden; header cells carry
  `scope="col"`.
- `Modal` and `Drawer` are real dialogs: `role="dialog"`, `aria-modal`, an accessible
  name from the title, Escape to dismiss, a click on the overlay to dismiss, and focus
  moved in on open and restored to the trigger on close.
- `List` requires a `label`, in the same way and for the same reason `Table` requires a
  caption: sixty rows announced only as "list" are sixty rows of unattributed text. It
  also sets `role="list"` explicitly, because taking the bullets off takes the list
  semantics with them in some browsers.
- A selected `ListRow` carries `aria-current`, not `aria-selected`. Nothing here is a
  listbox — the row is not being chosen, it is the one whose detail is open beside it.
- `Avatar` takes a required `name`, and announces it as an image unless `decorative` is
  set. Set it wherever the name is written beside the avatar, which is most places: an
  avatar is a picture of a name, and hearing the name twice is worse than not seeing the
  picture. A picture that fails to load falls back to initials rather than to the
  browser's broken-image glyph.
- `MultiSelect` is a real disclosure over a real group: `aria-expanded` on the trigger,
  `aria-controls` pointing at the group, a `fieldset` with a legend around the
  checkboxes, and a trigger named by its label *and* by what is currently chosen.
  Escape closes it and hands focus back to the trigger.
- `Tabs` is a real tab strip: `role="tablist"`, an accessible name from its `label`, a
  single tab stop for the whole strip with the arrow keys moving between tabs, and each
  tab tied to its panel through a generated pair of ids. Only the selected panel is
  rendered, so a panel that loads its own data does not load it until it is shown.
- `Alert` chooses its own `role` from its tone — a failure is announced assertively,
  everything else politely — which is why `role` is not a prop.
- `DateRangeField` is a `fieldset` with a legend, and its presets are toggle buttons
  carrying `aria-pressed` rather than links that look pressed. It never emits a range
  that ends before it starts: moving one end past the other takes the other with it.
- `BarChart` requires a `caption`, in the same way and for the same reason `Table` does.
- `StatCard` says which way a figure moved in words; the arrow beside it is decorative
  and hidden.
- Loading and empty states belong to `TableBody` and `List` via `isLoading` and
  `isEmpty`, so that the loading message is announced through `role="status"` in every
  table and every list rather than in whichever ones remembered to do it. `StatCard`
  and `BarChart` own theirs the same way, so a screen full of figures waits as one
  thing rather than as five. Loading wins over empty where both are set: nothing having
  arrived yet is not the same as there being nothing.

## Composing classes

Every primitive merges class names through `cn()` from `packages/shared/src/cn.ts`, which is clsx
plus tailwind-merge. The incoming `className` is always merged last so a caller can
override a default without an `!important` or a specificity fight.

```tsx
className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
```

Use `cn()` in every new component, in that order.
