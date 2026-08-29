# Design system

Everything the application renders is built from the primitives in this folder and
the tokens in `tokens.css`. There is no third-party component library, and there is
deliberately no lint rule enforcing any of what follows. These are the rules; holding
to them is a matter of reading them.

## Only semantic token classes

`tokens.css` declares a semantic colour scale — `surface`, `border`, `fg`, `muted`,
`primary`, `info`, `success`, `warning`, `danger` — and that scale is the vocabulary
this codebase is written in.

Write `bg-primary`, `text-fg-muted`, `border-border`. Never write `bg-blue-500`,
`text-gray-700`, or `border-slate-200`. Those classes are not broken: Tailwind's
default palette is still there, `bg-blue-500` resolves to a real colour, and nothing
in the build will stop you. That is exactly the difficulty. A screen written in
`slate` and `blue` looks right on the day it is written, and is outside the system
from then on — a colour nobody can restyle, because it was never named.

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
which owns the five variants (`primary`, `secondary`, `ghost`, `danger`, `selected`),
the two sizes (`sm`, `md`), the focus ring, the disabled treatment, and the
`type="button"` default that stops a button inside a form from submitting it by
accident.

`selected` is a variant and not a `className`, because "this is the one currently
chosen" had been written five times in four different ways — a saved view, a date
preset, a tab and a list row all tinted themselves slightly differently, and the two
that agreed agreed character for character, which is its own kind of warning. It is
appearance only. What tells assistive technology a control is chosen is
`aria-current`, `aria-pressed` or `aria-selected`, whichever the pattern around it
calls for, and choosing between those three stays with the caller.

There is one selected thing in the app that is not a `Button`: the main nav in
`AppLayout`, which is a `NavLink`. A link is not a button — it goes somewhere — and
dressing it as one to reach this variant would be the wrong trade. It keeps its own
classes until there is a nav item primitive to give it.

The same applies to the other primitives. If a text field, a dropdown, a card, a
table, a list, or a dialog is needed, it comes from this folder. When a primitive
cannot do what a screen needs, extend the primitive — do not build a parallel one
next to it.

`ListRow` is the case worth reading. A dense row is a small target and the useful
target is all of it, so a selectable row is one wide control — and that control is
`Button` with its height and radius overridden, not a `<button>` written next to
`Button/`. `Tab` is built the same way. Everything a control has to get right, from
the focus ring to the `type="button"` default, is got right once.

## Never hand-build a checkbox

`<input type="checkbox" className="size-4 accent-primary">` was written three
times — the header cell and the row cell of the ticket table, and every option in
`MultiSelect` — and the three copies agreed on precisely the two classes that are
easy to agree on. What none of them had was a disabled treatment, so the
select-all box in the ticket header looked the same whether it could be used or
not. And none of them could say *some of these*: a header box over a half-selected
page draws what it draws over an empty one.

`Checkbox` owns all three. `label` is required, the way `Icon` requires one, so a
box cannot be rendered unnamed — a selection column is otherwise a column of
controls announced only as "checkbox". `labelHidden` makes that label the
accessible name without drawing the words, which is what a cell in a table needs
and what a row of filter options does not: with the label visible it wraps the
box, so the words are a click target too.

`indeterminate` is the third state, and it is written to the node as a DOM
property because that is the only form it has — there is no attribute for it. It
is deliberately not paired with `aria-checked="mixed"`: a native checkbox already
reports mixed, and an ARIA state layered on a native one is a second source for
one fact and a second thing that can disagree.

The disabled treatment is `opacity-50` rather than the `bg-muted` `Input`,
`Select` and `Textarea` use, because `accent-primary` paints the box itself and a
background behind it is a background nobody sees. There is no focus-ring override
for the same kind of reason: the box is drawn by the browser, and so is the ring
that fits it.

Where a checkbox leads a `ListRow`, it is this one. `leading` takes an `Avatar`,
an `Icon` or a `Checkbox` — three primitives, not a raw input dressed to match
whichever of them it happens to sit beside.

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

## The icon library stays behind `Icon/`

For the same reason, and it is worth saying twice: `Icon/` is the only file that
imports the icon library. Feature code names an icon out of `IconName` — a closed
union, keyed into a table, so an unwired name is a compile error rather than a blank
square — and reads nothing of the library's API.

Before this there was no icon primitive, so icons were Unicode in JSX text: `&#215;`
in two dialogs, `&#9998;` and another `&#215;` in the saved views sidebar, a caret in
`MultiSelect`, three arrows in `StatCard`, and an arrow inside the text of a link on
the ticket screen — which meant a screen reader announced that link as "left arrow,
Back to tickets".

Two rules come with it. **An icon is sized from the spacing scale**, `sm`, `md` or
`lg`, never from the text it sits beside: a glyph in a sentence inherits the
sentence, but a picture that resizes with its caption is a picture nobody can lay
out. And **an icon says what it means**. `label` is required, the way `Avatar`
requires a `name`, so an icon cannot be rendered without someone having decided what
it says; pass `decorative` where the meaning is already written next to it or the
control around it carries its own `aria-label`. The effect is that an icon-only
control is named by its icon even when whoever wrote it forgot to name the control.

## Type has a semantic layer, the way colour does

`tokens.css` names its type as well as its colours. `text-title` is the one heading
at the top of a screen, `text-section` the heading on a card or a dialog,
`text-subsection` a heading on a group inside one, and prose is `text-body` with
`text-caption` under it. Each carries its own line height, and the three headings
carry their weight, so a heading is never `text-2xl font-semibold text-fg`
reassembled by hand — which is how six screens came to have six copies of the same
page title and a seventh invented a level of its own.

`Heading` takes a semantic `level` and an optional element `as`, because those are
two questions and answering one should not answer the other: how much weight this
carries, and where it sits in the document outline. `CardHeader` takes the same
`level`, so a card in a sidebar and a card filling the screen no longer have to weigh
the same. `Text` takes a `size` and a `tone` off the same scale.

`Text` also wraps. It sets `wrap-anywhere` — `overflow-wrap: anywhere` — and not
`break-words`, and the difference is the whole reason it is there. The two render
identically at any fixed width; only `anywhere` counts toward an element's min-content
size, and min-content is what a grid item's automatic minimum is made of. One
200-character URL in a ticket description was enough to push its card out of its
column and put a scrollbar under the page, and `break-words` would not have fixed it.

**One trap, worth knowing before you add a token.** A semantic type token is
`text-<word>`, which tailwind-merge reads as a *colour*. Left alone, `cn()` resolves
`text-title text-fg` to `text-fg` and the size disappears — silently, with nothing to
notice. Every semantic type token must therefore be listed in `semanticTextSizes` in
`packages/shared/src/cn.ts`. The list in `cn.ts` and the tokens in `tokens.css` are
one thing written in two places and nothing enforces the pairing.

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
through, and it is expected to be opened and closed a dozen times against it. What
differs is placement and purpose, which is not a size prop.

They share the dialog contract deliberately, and now they share it literally. `Dialog`
holds the whole of it — the role, the accessible name taken from the title, the
description wired through `aria-describedby`, Escape, the click on the overlay, focus
moved in on open, kept inside while open and given back to the trigger on close — so a
dialog bug is fixed once instead of in whichever of the two someone noticed it in. It
was written twice before, and the copies had already started to disagree.

`Dialog` is not exported. Its props are the seams where a modal and a drawer differ —
the overlay, the panel, the word on the close button, and the body, which each wraps
itself because whether the contents scroll is one of the few things that genuinely is
different. Those are not a product API. A feature reaching for `Dialog` would be
choosing overlay and panel classes by hand, which is the thing this file opens by
forbidding, and the result would be a third dialog that dismisses slightly
differently.

`ConfirmDialog` is the one composition worth having on top of it. A modal, a secondary
Cancel and a confirming button that says what it will do had been built by hand at
every destructive action, and the copies had drifted: two disabled both buttons while
the request was in flight and one did not, so one of them could be fired twice by a
double click. It takes a title, a description, a confirm label, a danger flag, a busy
state and the two callbacks, and that is the whole of it.

## A bar across a card is not always a `CardHeader`

`CardHeader` and `CardFooter` own the header and footer strips — the border, the
padding, the heading, the row of actions — and anything that draws one of those
strips by hand is a copy waiting to drift. `Modal`, `Drawer` and `ReportToolbar` each
had one, and all three now use the real thing.

`TicketsToolbar` looks like a fourth and is not. `CardHeader` renders a heading,
requires a title to put in it, and pads to the card scale; a toolbar is a row of
controls with nothing to head it, on the tighter scale a table uses. Dressing it as a
`CardHeader` would mean making the title optional and then overriding five of the six
classes that make a `CardHeader` a `CardHeader`, which is not reuse — it is a costume.
The distinction to keep: a header says what a card is, a toolbar acts on it, and the
fact that both are a strip with a border does not make them the same strip.

## An `Alert` has a tone and a shape, and they are two questions

`tone` is what the message means. `variant` is where it sits, and it had been
answered in `className` three times: a toolbar taking the chrome off with
`border-0 bg-transparent p-0`, and two cards squaring a callout into a band with
`items-center rounded-none border-x-0 border-t-0` — the same four classes in the
same order, in two features that had never read each other. Each of those is
`Alert` imported for its tone and the `role` that follows from it, and then taken
apart to fit where it landed.

| Variant | Shape |
| --- | --- |
| `callout` | the default; stands on its own, tinted and bordered and rounded |
| `inline` | a line in a row of controls, carrying no chrome of its own |
| `band` | spans a card edge to edge, separated from what follows by its bottom edge |

`inline` has no chrome because the row around it already has the padding and the
border; a message in a toolbar is not a callout, it is a line in the toolbar.
`band` draws a bottom edge and nothing else — the base sets no border width, so a
variant that names no border draws none, and a tone contributes a border *colour*
with nothing to show it.

They are named for the shape being asked for rather than for the classes each one
drops. `inline` says what the caller wanted; `border-0 bg-transparent p-0` says
what they took away, and only the first still means anything after someone
changes the padding scale. `className` is still the right way to say where a
message sits in its parent — `mr-auto` in a toolbar — but not what it is made of.

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

Type is the exception that is worth stating carefully: reach for the semantic level —
`text-title`, `text-section`, `text-body` — and let `text-xs` through `text-2xl` be
what the semantic layer is built out of rather than what screens are built out of. A
raw size is right where the thing is not text in the semantic sense, such as the
figure on a `StatCard`, which is a number and not a heading.

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
- `Modal` and `Drawer` are real dialogs, and both are `Dialog`: `role="dialog"`,
  `aria-modal`, an accessible name from the title, Escape to dismiss, a click on the
  overlay to dismiss, focus moved in on open and restored to the trigger on close, and
  Tab kept inside while it is open. The trap is the other half of `aria-modal`, which
  says the rest of the page is inert: without it that is a claim the keyboard
  immediately contradicts, walking out into a page the reader has been told is not
  there and leaving no way back except finding the dialog again.
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
  everything else politely — which is why `role` is not a prop. `variant` changes
  the shape and nothing else, so a message stripped to a line in a toolbar is still
  announced the way its tone says it should be.
- `Checkbox` takes a required `label`, so a box cannot be rendered unnamed, and
  `labelHidden` turns that label into the accessible name rather than dropping it.
  Its `indeterminate` state is the native DOM property with no `aria-checked`
  beside it: the browser already reports mixed, and one state with two sources is
  one source too many.
- `DateRangeField` is a `fieldset` with a legend, and its presets are toggle buttons
  carrying `aria-pressed` rather than links that look pressed. It never emits a range
  that ends before it starts: moving one end past the other takes the other with it.
- `BarChart` requires a `caption`, in the same way and for the same reason `Table` does.
- `StatCard` says which way a figure moved in words; the arrow beside it is decorative
  and hidden.
- Loading and empty states are one component. `StateMessage` owns the padding, the
  type, and the `role="status"` a wait is announced through, and `TableBody`, `List`,
  `BarChart` and `StatCard` all render it — `isLoading` and `isEmpty` are the whole of
  what a caller says. Each of them used to declare the same three things separately,
  which is how the copies that got written inline elsewhere came to have no live region
  at all: a wait nobody is told about is not a loading state, it is a blank area with a
  sentence in it. Loading wins over empty where both are set, because nothing having
  arrived yet is not the same as there being nothing.

## Composing classes

Every primitive merges class names through `cn()` from `packages/shared/src/cn.ts`, which is clsx
plus tailwind-merge. The incoming `className` is always merged last so a caller can
override a default without an `!important` or a specificity fight.

```tsx
className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
```

Use `cn()` in every new component, in that order.
