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
| `primary-fg` | text placed on top of the solid fill |
| `primary-subtle` | tinted background for badges and callouts |
| `primary-subtle-fg` | text on a tinted background |
| `primary-border` | border matching a tinted background |

Five, and there is no `primary-hover` among them — nor a `-hover` on any other family.
A family says what it *is*; hover and pressed are a neutral tint laid over whatever
background an element already has, which is one decision rather than one per family.
See "Hover and pressed are one tint" below.

Icons are the one thing with a ramp of its own — `icon-primary`, `icon-secondary`,
`icon-disabled` — and it is separate from `fg` on purpose. An icon takes `currentColor`
unless it is told otherwise, which means it is always exactly as loud as the sentence
it sits in and had no way to be quieter than the words beside it. The three are
`var()` references to `fg`, `fg-muted` and `fg-subtle` rather than copies of their
values, which is what let a whole change of identity move every icon in the app without
a line in the icon group being touched. Naming them apart is still what lets the two
ramps come apart later, on the day an icon should not weigh what the text beside it
weighs.

**The five subtle tints are one set, and they have to be checked as one.**
`muted`, `info-subtle`, `success-subtle`, `warning-subtle` and `danger-subtle` are
what `Badge` draws, so all five can be on one screen at once and usually are: Free,
Starter, Pro and Enterprise down the customer list; Open, Resolved and Medium across a
ticket row. Each being a reasonable colour on its own is not the requirement. Five
being five colours *side by side* is.

That is the requirement this file has failed once already, and the way it failed is
worth knowing, because it was not carelessness. `info-subtle` and `primary-subtle` were
each warmed — correctly, one at a time — until they had crossed 50° of hue into green,
where `success-subtle` already was; and warmth had been bought by taking the chroma
out, which is what left them with no family to be recognised by. Three tints inside
ΔE 0.021 of each other in OKLab, which is a colour drawn three times. On the customer
list that is Free, Starter and Pro rendered the same.

The floor is ΔE 0.052 now, between `muted` and `success-subtle`, with every other pair
of the five further apart than that; `primary-subtle` is measured in the same
comparison, because it is the fill under a bulk-action bar with badges in the rows
below it, and its nearest neighbour is 0.044. Every `-subtle-fg` measures at least
6.1:1 on its own `-subtle`. `tokens.css` carries the per-family numbers and the
argument for each.

One of the five is on the cool side of neutral, and it is deliberate: `info-subtle` is
b* -0.013 against the page's +0.014, because a blue that is warmer than the page is not
a blue. The warmth rule that produced the collision is an argument about *chrome* — a
nav item and a selected row are on screen the whole time and have to belong to the page
— and a status chip is not chrome.

**Add a tint and you check it against the other five**, not against the page. A
colour that looks right alone and lands ΔE 0.015 from the one beside it is the defect
this paragraph exists for.

Two numbers about the neutrals are worth carrying. Text on them is comfortable — `fg`
measures 14.7:1 on a card and `fg-muted` 6.9:1 — and `fg-subtle` is not: 3.6:1 on a
card, 3.5:1 on the page, 3.2:1 on an inset. That is above the 3:1 a disabled control
needs and below the 4.5:1 normal text needs, which makes it a correct colour for a
disabled icon and a borderline one for the two places it is currently text, a field's
placeholder and a comment's timestamp.

If you need a colour that is not on the scale, add a token to `tokens.css` and give it
a semantic name. Do not reach around the scale with a hex value.

## Never hand-build a button

`<button className="...">` does not belong anywhere outside `Button/`. Use `Button`,
which owns the five variants (`primary`, `secondary`, `ghost`, `danger`, `selected`),
the two sizes (`sm`, `md`), the focus ring, the hover and pressed states, the disabled
treatment, and the `type="button"` default that stops a button inside a form from
submitting it by accident.

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

Which is also why a row's checkbox is a prop and not something a caller puts in
`leading`. `leading` renders *inside* that one wide control, and a checkbox inside a
button is not a checkbox: the button takes the click, and the markup is invalid
besides. `ListRow` takes a `selection` — a label, a checked state and a handler,
grouped, because none of the three means anything without the other two — and renders
the box beside the row instead. Ticking a row and opening it are then two controls in
the order a keyboard meets them, and they answer different questions: `selection` is
what the next bulk action will act on, `isSelected` is the row whose detail is open
beside the list.

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

The checkbox on a `ListRow` is this one too. It arrives through `selection`
rather than `leading`, for the reason above — beside the row control, not inside
it — and `selection` requires a label of its own for exactly the reason
`Checkbox` does: sixty boxes all announced as "Select" are sixty controls nobody
can tell apart.

## The charting library stays behind `Chart/`

`Chart/` is the only place in this codebase that imports the charting library. Feature
code hands it `ChartDatum[]` and reads nothing of the library's API, so replacing the
library is a change to one component rather than to every screen that draws something.

A charting library ships its own palette, and a chart drawn in it is the one thing on
the page that does not belong to this design system. Marks take their fill from the
token custom properties — `var(--color-success)`, never `#4f6f52` and never the
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

Three rules come with it. **An icon is sized from the spacing scale**, `sm`, `md` or
`lg`, never from the text it sits beside: a glyph in a sentence inherits the
sentence, but a picture that resizes with its caption is a picture nobody can lay
out. And **an icon says what it means**. `label` is required, the way `Avatar`
requires a `name`, so an icon cannot be rendered without someone having decided what
it says; pass `decorative` where the meaning is already written next to it or the
control around it carries its own `aria-label`. The effect is that an icon-only
control is named by its icon even when whoever wrote it forgot to name the control.

The third is **an icon is coloured from the icon ramp, or from nothing at all**.
`tone` defaults to `inherit`, which is `currentColor` and is right for an icon inside
a `Button` or inside a sentence — it is part of that thing and should weigh what that
thing weighs. `primary`, `secondary` and `disabled` are for an icon that is not part
of the text beside it and should not be as loud as it. Before the ramp existed the
only way to say that was to reach for a text colour, which said the wrong thing about
what the icon was; `MultiSelect`'s chevron is still doing exactly that, and is the
one call site left to move.

## Type has a semantic layer, the way colour does

The family is IBM Plex Sans, named in `tokens.css` and loaded in
`apps/web/index.html`. Those two move together: a family named in a token and not
loaded is a font every browser goes looking for, fails to find, and silently replaces
with the next name in the stack — a design system that is correct in the CSS and wrong
on the screen. The names after it are picked for metrics rather than taste, so the swap
when the webfont arrives moves the text as little as a swap can.

`tokens.css` names its type as well as its colours. `text-title` is the one heading
at the top of a screen, `text-section` the heading on a card or a dialog,
`text-subsection` a heading on a group inside one, and prose is `text-body` with
`text-caption` under it. Each carries its own line height, and the three headings
carry their weight, so a heading is never a raw size and a weight reassembled by
hand — which is how six screens came to have six copies of the same page title and a
seventh invented a level of its own.

The layer underneath is a scale and not a list. Sizes are
`round(12px × 2 ^ (step / 10))` — a 12px base, and a ratio that doubles the scale every
ten steps. The six named sizes are 12, 13, 14, 17, 21 and 28, and every one of them is
that formula rounded.

The ratio is fine because it has to be. This identity wants a subsection at 13px and a
body at 14px, seven per cent apart, and a scale whose step is fifteen per cent cannot
hold two sizes seven per cent apart — one of the pair would have to come off the scale
and be a number somebody typed. Ten steps to the octave is the coarsest ratio that
rounds onto all five sizes the semantic layer needs. What it costs is that the scale is
finer than the product is: the six names sit at steps 0, 1, 2, 5, 8 and 12 rather than
at 0 through 5. A name marks a step this product spends, and the gaps between them are
where the next size will come from.

What it bought is an exception gone. The old scale had one number on it that was not on
it — the fourth step, kept at 20px where the formula said 21 — and this one has none.

Line height is computed, not chosen. Take 1.5 below 20px, 1.4 from 20 to 31px and
1.25 at 32px and above; snap to the 4px grid; never come closer than fontSize + 4px.
Five of the six steps satisfy it, as five of six did before. The smallest does not: the
rule asks 20px on 12px text and this file says 16px, which is exactly the fontSize +
4px floor the rule itself sets. 1.67 on twelve-pixel meta text reads as a gap between
lines rather than as lines, so the value stays and the rule is the one that is wrong at
the small end.

The top of the scale is where the rule now shows its hand. A 24px title took 32px of
line height; a 28px title takes 40px, because 39.2 snaps up rather than down. Nothing
was chosen there — the size grew and the rule answered — and 1.43 on a page title is
looser than the 1.33 it replaces. It is the one computed value on this scale worth
checking on a screen rather than on paper.

Weight is named too — `normal`, `medium`, `semibold`, `bold` — and the three heading
levels reference `semibold` rather than each stating `600`. A bare number in three
places is three places to change and nothing to say what it means; a level pointing
at a weight is one decision, made once.

A semantic level therefore restates nothing. `--text-section` is a `var()` at the
step it sits on, its line height is that step's line height, and its weight is a
named weight, so the numbers live at the bottom of the file and the vocabulary sits
on top of them. That is the same arrangement as the colours, where `#335c67` is a raw
value and `primary` is what this product does with it.

Letter-spacing is the fourth axis on a level, and it is the first thing here that
breaks that arrangement: it points at no raw token, because it has none. `title` is
-0.02em and `section` is -0.01em, and those are optical corrections for two particular
levels rather than steps on a ramp — a raw scale of two values each used once would be
a layer with nothing in it.

It costs five tokens to carry two values. `subsection`, `body` and `caption` declare
`normal` rather than declaring nothing, because a level that says nothing about
letter-spacing lets an inherited one through, and a level exists to settle a question
rather than pass it on. What it does not cost is `cn()`. Tailwind emits a level's
tracking as `var(--tw-tracking, …)`, which is the property `tracking-*` sets, so a
caller asking for different tracking wins whatever the class order, and `tracking-` is
a class group tailwind-merge already knows. It is the first token group added here that
needs no matching entry in `cn.ts` — `TableHeaderCell` writes its own tracking and
still wins.

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
one thing written in two places and nothing enforces the pairing. The radius names
below have the same problem and the same answer, `semanticRadii`, a few lines down
the same file.

## A radius is named for what it is drawn on

`sm`, `md` and `lg` said which of three sizes a corner was and nothing about which to
reach for, so the answer was whichever the last component happened to use. The scale
is now six names and each one says where it belongs:

| Token | Rule |
| --- | --- |
| `rounded-none` | a corner that meets another one: a row in a list, a strip across a card |
| `rounded-inner` | a corner nested inside a rounded one — see the concentric rule below |
| `rounded-element` | an interactive control: a button, a field, a badge that is not a pill, a popover |
| `rounded-container` | a thing that holds other things: a card, a dialog, a tab strip |
| `rounded-page` | a surface that fills the view it sits in |
| `rounded-full` | a pill or a circle: an avatar, a status badge |

`none` and `full` are Tailwind's own, `0` and an effective infinity, so `tokens.css`
declares the four in between and names all six. The old names are gone from the theme rather than left beside the new
ones, so `rounded-md` now produces no CSS at all — a missed call site is a corner that
visibly squares itself rather than one nobody notices for a year.

Naming them is also what made the corners sharper for nothing. All four values came
down — 2, 3, 4 and 8 pixels now — and no call site moved, because no call site ever
said how big a corner was. A scale named `sm` through `lg` would first have had to
decide whether `md` still meant what it used to.

**The concentric rule, for `inner`.** A rounded box with padding needs its inner
corner at `max(0, outer − padding)`. Match the outer radius instead and the two curves
run parallel rather than sharing a centre, and the gap between them visibly widens
through the corner. In this product it currently resolves to zero everywhere it could
apply, and by a wider margin than before — `Card` is a 4px corner around 12–16px of
padding, so `max(0, 4 − 16)` is 0,
which is what a square-cornered child already draws. `Card` therefore does not set it,
and `inner` is here for the day a tighter container needs it.

## The focus ring is written once

Say `focus-ring`. Not `focus-visible:` three times.

Width, style, colour and offset are four tokens in `tokens.css` and `focus-ring` is
the single style that spends them. Before this, ten controls each wrote their own
copy of the same three utilities — `Button`, `Tabs`, the nav in `AppLayout`, four
links across two features, and the three form controls — and the copies had already
started to disagree on the offset. That is the part that drifts first, because
nothing on screen shows two controls disagreeing about a ring unless both are focused
at once, which never happens.

`focus-ring-inset` is the same ring at offset 0, and it is a decision rather than
drift: a field's ring belongs on its border, not outside it, so the control does not
appear to grow when it is focused. `Input`, `Select` and `Textarea` use it and nothing
else does. Two names, one token apart, beats one name and three exceptions.

`Checkbox` has neither, on purpose: the box is drawn by the browser and so is the ring
that fits it.

## Hover and pressed are one tint

Say `interactive`. Not a hover colour per variant.

An element that answers a pointer gets both states from one pair of tokens:
`--color-overlay-hover` and `--color-overlay-pressed`, the foreground ink at 5% and at
10%. `Button`'s base carries it, so every variant has it, and so do the three controls
built on `Button` — `ListRow`, `Tab`, and the presets in `DateRangeField` — without any
of them saying anything at all. The nav link in `AppLayout` is not a `Button` and says
`interactive` itself; so does the `Checkbox` label, which takes the click for the whole
control and so should answer for the whole control.

The mechanism is what makes one pair enough. The tint is a `background-image` — a
gradient between one colour and itself, which is a flat layer — and a background image
paints *over* a background colour rather than replacing it. The same two values
therefore sit on a solid fill, on a tinted fill and on nothing at all, and a variant
declares one background and no states. That is the property worth keeping: the sixth
variant is free.

What it replaced could not have been. Hover was a colour per family, of which exactly
two were ever spent, so a new variant needed a new colour before it could be hovered at
all. Pressed would have taken a `-pressed` on every family, nobody was going to write
five of them, and so no control in this product had a pressed state — which is the whole
argument for a layer rather than a palette entry, made by the thing that was missing
rather than by the thing that was there.

Two consequences worth knowing. The tint is weaker on the two solid fills than the
colours it replaces: 5% of a dark ink over `primary` or `danger` is a small step on an
already-dark fill, where `--color-primary-hover` was a deliberate one. And a `selected`
control now answers the pointer, where before it restated its own two colours on hover
in order not to — so the one control on screen already chosen was the only one ignoring
you.

`ghost` keeps a hover of its own, and it is a foreground rather than a background. The
tint says "this is responding to you"; the text coming up from `fg-muted` to `fg` says
"this is the one you are pointing at". A muted control is the only place the second
question needs asking.

A `TableRow` hover is not this, and should not become it. `features/tickets` tints its
rows with `hover:bg-surface-muted`, and that is a reading aid — which row your eye is on
across six columns — sitting on an element nobody can press. `interactive` would give it
a pressed state it has no way to earn.

## Control height, border width and motion are tokens too

**Height.** `Button`'s two sizes are `--size-element-sm` and `--size-element-md`, not
a pair of Tailwind height classes. They were classes, which meant the two heights
every control in the product lines up against lived inside one component and a denser
build of this app had no way to ask for them. `Input`, `Select` and `Textarea` are
still sized by their padding, because a textarea has rows and a field grows with its
font; that is worth revisiting and it is not settled here. The nav item in `AppLayout`
is a third height written by hand, and it is the next thing to fix — it currently
happens to agree with `--size-element-md`, which is a coincidence and not a fix.

A density pass proves the point and finds the other half of it. Both control heights
came down from `tokens.css` alone. The horizontal padding beside them did not, because
it is a Tailwind class inside `Button` and there is no token for it — and the same is
true of the three form controls, `Card`'s three strips, `TableCell` and `ListRow`. A
control's height is a decision the theme holds; a control's padding is the same
decision held by six components. Padding tokens are the fix and they are the next thing
to add.

The same pass found the worse case, which was not a component at all: strip padding was
held by *six call sites in feature code*, because no component owned it. All six are now
`Toolbar` and the padding is in one place — which is the precondition for a token, not a
substitute for one. A number owned by one component can become a token in one edit; a
number spread across six features cannot become anything.

**Elevation.** One shadow. `--shadow-card` is nothing: a card is the lighter surface on
a darker page with a border, and that border is the whole of its edge. `--shadow-overlay`
is the only thing left that lifts, and it draws in `--color-shadow` rather than a hex
value written into a shadow. `Card` still spends the card token, so the decision lives
in `tokens.css` and giving cards a shadow back is one value rather than a component
edit. It is written `0 0 #0000` and not `none`, because Tailwind composes every shadow
utility into one comma-separated `box-shadow` and `none` is legal only as the whole of
that property, never as one item in the list.

**Border width.** One token, `--default-border-width`, which is what `border` reads.
There is no hairline and no heavy variant: a second width should be a decision
somebody makes in `tokens.css` rather than an arbitrary value at a call site.

**Motion.** Two durations, because there are two distances — a fade crosses no ground,
a panel crosses the edge of the screen. The `--animate-*` tokens reference them instead
of carrying `150ms ease-out` inline. Note that `--ease-enter` is the CSS `ease-out`
keyword and *not* Tailwind's `--ease-out`, which is a different curve; they are easy
to confuse and they do not look the same.

Two curves, though, not one. `--ease-enter` is for entrances, which happen once and in
one direction and can therefore afford to decelerate. `--ease-state` is `linear` and is
what `interactive` transitions on: a hover or a press crosses no ground, and it is
reversed halfway through — the pointer leaves, the button is released — as often as it
completes, so the curve is played backwards as often as forwards and `linear` is the
only one that looks the same both ways. Anything with a shape to it makes the release
read as slower than the press even though the two take the same time. It also keeps
`--ease-enter` honest: a tint appearing under a cursor has not entered from anywhere.

That transition was the last piece of motion living outside this system. Every control
said `transition-colors`, which reads Tailwind's *default* duration and *default* curve,
so the one thing in the app that animated on every single interaction was the one thing
not on the motion scale. `interactive` owns it now, at `--duration-fast` — a press is
the smallest interaction there is, and a control that lags the finger is worse than one
that does not move. Which is also why `transition-colors` is gone from `Button` and from
the nav rather than left beside it: two transition declarations on one element are two
rules fighting over the same properties, and which wins is a question about stylesheet
order.

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

## A bar across a card is not always a `CardHeader`, and now it is a `Toolbar`

`CardHeader` and `CardFooter` own the header and footer strips — the border, the
padding, the heading, the row of actions — and anything that draws one of those
strips by hand is a copy waiting to drift. `Modal`, `Drawer` and `ReportToolbar` each
had one, and all three now use the real thing.

`TicketsToolbar` looks like a fourth and is not. `CardHeader` renders a heading,
requires a title to put in it, and pads to the card scale; a toolbar is a row of
controls with nothing to head it, on the tighter scale a table cell uses. Dressing it
as a `CardHeader` would mean making the title optional and then overriding five of the
six classes that make a `CardHeader` a `CardHeader`, which is not reuse — it is a
costume. The distinction to keep: a header says what a card is, a toolbar acts on it,
and the fact that both are a strip with a border does not make them the same strip.

That distinction was right and the conclusion drawn from it — that `TicketsToolbar` was
therefore correct as it stood — was not. It was not a `CardHeader`; it was one of six
places writing the same strip by hand, and being unlike an existing primitive is not the
same as being unlike every primitive. A density pass proved it: moving the strip padding
one step edited thirteen lines across nine feature files, six of them this padding in six
different features, and not one of the six could be reached from `tokens.css`, because
`CardBody` owned the card's padding and nothing owned a strip's.

`Toolbar` owns it now.

```tsx
<Toolbar className="justify-end">…</Toolbar>              {/* above a table  */}
<Toolbar divider="top" className="justify-center">…</Toolbar>  {/* below a list */}
<Toolbar as="nav" divider="top" aria-label="Ticket list pagination">…</Toolbar>
```

**What a strip is**, and therefore what belongs in one: it sits above, below or inside
a card, it carries controls rather than content, and it owns its own padding and its
own divider. The filters over a list, the bar that appears when rows are ticked, the
pagination under a table, the load-more at the end of one.

**Three decisions and no more.** `divider` says which edge draws — `bottom` for a strip
above what it acts on, `top` for one below, `none` where the strips on either side
already draw a line. `as` is `div` or `nav`, for a strip that is a landmark a reader
navigates by.

Everything else is the arrangement of the caller's own children, and it is said in
`className` in this system's own vocabulary: `justify-between`, `items-end` where the
strip holds labelled fields whose boxes stand taller than the buttons beside them,
`bg-primary-subtle` where the strip appeared because something is selected. Those are
not classes reassembled out of `Toolbar` — they are one class each, each saying what
the caller wanted, and `cn()` resolves them against the defaults. That is the same line
`Alert` draws in the section above: `variant="inline"` is a shape the caller asked for
and had no other way to name; `justify-between` is plain flexbox and needs no second
name. A prop per Tailwind utility would be the costume again, pointing the other way.

**It is not `role="toolbar"`**, whatever it is called. That role is a promise about the
keyboard — one tab stop for the whole strip, arrow keys moving between the controls in
it — and none of these strips keeps it. `Toolbar` renders a `div` or a `nav` and takes
whatever `role` and `aria-label` the caller actually means: `role="group"` on the bulk
bars, a `nav` landmark on the pagination.

**Which strips it does not cover.** `CardHeader` and `CardFooter` stay: a header has a
heading in it and a footer has a fill and a scale of its own, and both are about the
card rather than about the controls. `TableHeaderCell` and `TableCell` share the strip
padding by coincidence of value, not of meaning — they are a grid, and a table's cell
padding should be free to move without a toolbar following it. `StateMessage` is
neither. And a bar that is a page's chrome rather than a card's — the app header in
`AppLayout` — is not a strip across a card and does not become one by having a border
at the bottom.

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
the six names above, type from `text-xs` through `text-2xl`, elevation from
`shadow-card` and `shadow-overlay`, and a control's height from the size tokens.

Type is the exception that is worth stating carefully: reach for the semantic level —
`text-title`, `text-section`, `text-body` — and let `text-xs` through `text-2xl` be
what the semantic layer is built out of rather than what screens are built out of. A
raw size is right where the thing is not text in the semantic sense, such as the
figure on a `StatCard`, which is a number and not a heading.

An arbitrary value is a sign that either the design is off-grid or the scale is
missing a step. Both are worth resolving before the class is written.

Motion is on a scale too — `--animate-fade-in`, `--animate-slide-in-right`, built out
of `--duration-fast`, `--duration-slow` and `--ease-enter` — and it is short. `Drawer` is the only thing in the app that moves, and it moves because a panel
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
- A `ListRow` checkbox is named by what it selects — "Select Priya Raman", not
  "Select". Sixty checkboxes with one name between them are sixty controls a screen
  reader cannot tell apart, and the row's own text is no help: it belongs to the
  control next to it.
- Every checkbox in the app is `Checkbox`: `MultiSelect`, `ListRow`, and both of the
  ticket table's columns. The note that stood here said there was no such primitive yet
  and counted three of those four, having read the select-all cell in the header and
  not the one on every row twenty-nine lines below it. Both halves of that stopped
  being true and neither announced it — a census taken by eye goes stale the way a
  hand-written padding value does.
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

`cn()` carries two extensions, and both are there because tailwind-merge cannot know
what this design system named. `semanticTextSizes` stops `text-title` being read as a
colour; `semanticRadii` stops `rounded-element` being read as nothing at all, which is
what lets `ListRow` square the corners of the `Button` it is built on. Add a semantic
type token or a radius token to `tokens.css` and you have to add it there too.

Not every axis costs that. A level's letter-spacing rides inside the font-size utility
as `var(--tw-tracking, …)`, and `tracking-` is a namespace tailwind-merge already
knows, so `--text-title--letter-spacing` needed no entry. The rule is about names
tailwind-merge cannot classify, not about tokens in general.
