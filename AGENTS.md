# AGENTS.md

Support Desk, a support-tickets admin panel on its own design system: `packages/ui`
renders, `apps/web` composes, `packages/shared` holds the contract. Everything a machine
can check is enforced — `internal/eslint-plugin-harness/README.md` has the lint rules and
the defect behind each, `packages/ui/README.md` the design system in full; check your work
with `npm run lint:strict`, `typecheck`, `test`, `lint:boundaries`, `lint:duplication`,
and — after `npm run build`, because it reads the stylesheet — `lint:classes`.
Typecheck and lint also run automatically after every file you write, so read what they
say and fix it there rather than at the end. Below is the rest.

## What the sensors ask of you

Five checks read the result rather than the source, and each has a habit attached.
`README.md` says where each one runs and what it cannot see.

- Write the assertion that would fail. `npm run test:mutation:fast` changes the code to
  be wrong and reports every change no test noticed, so a test that renders something and
  asserts nothing raises coverage and scores zero. Five minutes; CI runs the full one.
  Two things neither can see: a defect in a *fixture*, and anything outside `packages/`.
- Give a fixture varied data. Where every row of a fixture carries the same value, the
  comparison that reads it can be deleted and nothing fails. `DateRangeField.test.tsx`
  has two presets ending on the same date, and half of `isSameRange` is unreachable
  because of it.
- Never copy a file to start a new one. `npm run lint:duplication` compares shape with
  the names erased, so renaming does not hide it, and every pair over the line has to be
  written down with an argument for why.
- Cite a path, or a table by name — `TICKET_STATUSES`, `NAVIGATION_TARGETS` — only if it
  still resolves. Both are lint errors, in Markdown as well as in a comment, and both are
  how the root README came to describe a layout two refactors out of date.
- Check that a class *resolves*, not that it is spelled right. `npm run build && npm run
  lint:classes` reads the stylesheet that shipped. Delete a radius or a colour from
  `tokens.css` and every class built from it still compiles, still passes its tests and
  draws nothing. So does an unanchored pattern in `.gitignore`: Tailwind's scanner honours
  it, and a bare `reports` hid a whole feature.

## Button variants

- Always give a screen one `primary`: the single action it exists for. Never a second.
- Use `secondary` for every other action that is not destructive.
- Use `ghost` for an action inside a row, a chip or a toolbar.
- Use `danger` for an action that destroys data — on the trigger and on the confirming
  button alike.
- Always route a destructive action through `ConfirmDialog`.
- Always mark an active row, tab or chip with `variant="selected"`. Never hand-write a
  selected state in `className`.
- Never hand-write a hover or a pressed state either. `interactive` owns both and
  `Button` already says it; anything actionable that is not a `Button` says it itself.

## Card padding, and strip padding

- Always let `CardBody` own a card's. Never pad a raw `<div>` to the card scale:
  `px-4 py-3` is what `CardBody` is, and eight padding values grew across the app before
  this was said. The number in that sentence has already changed once — which is the
  argument for asking `CardBody`, not for memorising it.
- Always let `Toolbar` own a strip's, and the divider with it. A strip sits above, below
  or inside a card and carries controls rather than content: the filters over a list, the
  bar that appears when rows are ticked, the pagination, the load-more. Six call sites in
  feature code wrote that padding by hand before `Toolbar` existed, and no token could
  reach any of them.
- Say what the strip *is* in props — `divider` for the edge it draws, `as` for a strip
  that is a landmark. Say how its children sit in `className`: `justify-between`,
  `items-end`, `bg-primary-subtle`. A prop per flexbox utility is the costume the design
  system README warns about, pointing the other way.
- Neither is `CardHeader`. A header says what a card is and has a heading in it; a strip
  acts on the card and has none.

## Modal, Drawer or CommandPalette

- Choose `Modal` for a question that must be answered before anything else happens —
  naming a saved view.
- Choose `Drawer` for a panel that accompanies the screen behind it and can be dismissed
  without answering — a record viewed beside its list.
- Choose `CommandPalette` for a field over a list of things to go to. Its options are
  data, never children: the arrow keys walk the array you pass, and children would be a
  second order to disagree with the one on screen.

## Table or List

- Choose `Table` for dense data where every row answers the same questions in the same
  order, read across.
- Choose `List` where a row has a shape instead — something to lead with, a line, a
  quieter line under it — scanned down.
- Both are here on purpose. Pick by the shape of the data, not by the last screen you saw.

## Components

- Always build an editable surface as a `<form>` with a `type="submit"` button, so Enter
  saves. `SavedViewNameDialog` shows a submit button that sits outside the form element.
- Always render a discriminated union through a `switch`, so TypeScript checks
  exhaustiveness. Avoid a chain of independent ternaries.
- Extract a repeated block inside a `.map()` into a named component. The threshold rules
  say when you have gone far past this; the judgement is yours before they fire.
- Use `Alert` for errors and `StateMessage` for loading and empty. Never assemble either
  by hand, and never switch `Alert`'s chrome off in `className` — a message that is a
  line in a toolbar or a band across a card asks for that shape with `variant`.
- Never hand-build a checkbox. `Checkbox` owns the size, the accent, the disabled
  treatment, the label it cannot be rendered without, and the indeterminate state.

## Screens and who reaches them

- Never write a list of the app's screens. `NAVIGATION_TARGETS` in the shared contract
  is the one, and the header nav, the route guard and the global search all read it.
- Say who may reach a screen with `roles` on that table, and ask with
  `canReachNavigationTarget`. Gating a screen there gates the nav item, the route and
  every search result that lives on it, in one edit.

## A ticket status is a position, not a value

- Never set a status. There is no field for one — `updateTicketBodySchema` carries a
  priority and an assignee — because a status changes by making a *named move*
  through `POST /api/tickets/:id/moves`.
- `packages/shared/src/workflow.ts` is the whole workflow: which moves exist, who may
  make each, and what has to be true first. It is tables and pure functions over them,
  and both ends read it. Adding a fifth status is an entry in `TICKET_STATUSES`, a
  label in `TICKET_STATUS_LABELS`, a badge in `TicketStatusBadge` and the moves that
  reach it. Both records are keyed by `TicketStatus`, so leaving either out is a
  compile error rather than a status drawn grey and unnamed, and a status nothing
  reaches fails `workflow.test.ts`. Nothing that reads `TICKET_STATUSES` for its
  members changes: the filters, the saved views, the reports, the CSV export.
- Never branch on a status to work out what can be done to a ticket. Ask
  `ticketMoveOffers` — and in the interface, ask the server: it may hide a move it has
  been told is unavailable, and it never decides availability, because a condition
  reads ticket state a browser can hold a stale copy of.
- Where a move is refused, say which condition failed rather than that it was refused.
  The sentence is the guard's `requirement`, and both ends show the same one.

## When a rule here is broken repeatedly

Move it into `internal/eslint-plugin-harness`: a rule that needs restating is one prose
is not carrying. A file under `src/rules` with the defect in its docblock, a test, a row
in `ROLLOUT`. This file stays short on purpose — a long one crowds out the task, makes
everything equally important, and rots.
