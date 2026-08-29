# AGENTS.md

Support Desk, a support-tickets admin panel on its own design system: `packages/ui`
renders, `apps/web` composes, `packages/shared` holds the contract. Everything a machine
can check is enforced — `internal/eslint-plugin-harness/README.md` has the lint rules and
the defect behind each, `packages/ui/README.md` the design system in full; check your work
with `npm run lint:strict`, `typecheck`, `test`, `lint:boundaries`. Below is the rest.

## Button variants

- Always give a screen one `primary`: the single action it exists for. Never a second.
- Use `secondary` for every other action that is not destructive.
- Use `ghost` for an action inside a row, a chip or a toolbar.
- Use `danger` for an action that destroys data — on the trigger and on the confirming
  button alike.
- Always route a destructive action through `ConfirmDialog`.
- Always mark an active row, tab or chip with `variant="selected"`. Never hand-write a
  selected state in `className`.

## Card padding

- Always let `CardBody` own it. Never pad a raw `<div>` to the card scale: `px-5 py-4` is
  what `CardBody` is, and eight padding values grew across the app before this was said.

## Modal or Drawer

- Choose `Modal` for a question that must be answered before anything else happens —
  naming a saved view.
- Choose `Drawer` for a panel that accompanies the screen behind it and can be dismissed
  without answering — a record viewed beside its list.

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

## When a rule here is broken repeatedly

Move it into `internal/eslint-plugin-harness`: a rule that needs restating is one prose
is not carrying. A file under `src/rules` with the defect in its docblock, a test, a row
in `ROLLOUT`. This file stays short on purpose — a long one crowds out the task, makes
everything equally important, and rots.
