# a11y

The accessibility tree, asserted against rather than described.

```
npm test        # the sweeps run with everything else
```

Two sweeps read it: `packages/ui/src/test/a11y.test.tsx` renders every exported
component, and `apps/web/src/test/a11y.test.tsx` renders every screen. This
package is the shared configuration between them, and the ledger of what was
found.

## Problem, mechanism, tool

| | |
| --- | --- |
| **Problem** | ARIA that is written but not wired. An attribute promising a behaviour — `aria-modal`, `aria-labelledby`, `role="list"` — while nothing implements or preserves it. It renders, it type-checks, and it is wrong only to somebody not looking at the screen. |
| **Mechanism** | The rendered result either has the roles, names and relationships or it does not, and that is a question with an answer. The tree exists in jsdom; nothing was asking it anything. |
| **Tool** | `axe-core`, the rule set behind every browser accessibility extension, run over the DOM the 562 existing tests were already producing. jsdom, Testing Library and `user-event` were installed; axe was the one thing missing. |

## Two layers, and the division between them

The static half is in `internal/eslint-plugin-harness`: `require-list-role` and
`aria-modal-needs-focus-trap`. This is the other half, and the split is not
arbitrary — **neither layer can do the other's job**, and the clearest proof is
the defect that started this.

Four hand-written lists in `apps/web` carried no `role="list"` while being laid
out with `display: flex`, which takes a list's semantics away in the same
browsers that removing the bullets does. **axe does not catch that.** Its `list`
rule checks that a `<ul>` contains `<li>` children, which those four did. The
failure is a browser behaviour rather than an ARIA error, so it is only visible
in the source — which is where the lint rule reads.

The reverse holds too. An `aria-labelledby` pointing at an id a conditional did
not render, two correct id generators colliding once both are on one screen, a
heading level that is right in a card and skips one in the page composing it: all
correct-looking source, all only wrong once the DOM exists.

## What it cannot see, which is most of what axe is famous for

jsdom has no layout engine. No boxes, no computed geometry, no painting — and
both vitest projects set `css: false`, so components render entirely unstyled.

**The whole visual half of WCAG is unchecked here, and unchecked anywhere else in
this repository.** Colour contrast, target size, focus visibility, reflow, text
spacing, anything about what is actually on screen. axe reports most of these as
*incomplete* rather than failing them, which is worse than a failure because a
green run looks like a pass. They are named in `NEEDS_LAYOUT` and switched off
explicitly, so that "the a11y sweep is green" cannot be read as covering them.
The place to check them is a browser.

Two more are off everywhere: `html-has-lang` and `document-title` are properties
of `apps/web/index.html`, which React never renders and jsdom supplies a blank
version of. Asking about them here would be asking the test harness about itself.

The page-level rules — `region`, `landmark-one-main`, `page-has-heading-one`,
`bypass`, `landmark-unique` — are off for the component sweep and **on** for the
screen sweep. A `Badge` rendered on its own fails all of them and is not wrong; a
screen that fails them is.

And the largest limitation of all: **axe finds violations of rules, not
unusability.** A screen can pass every rule here and still be impossible to work
through. Nothing automated closes that, and nothing here claims to.

## What the first run found

Two entries, both the same defect, in `RECORDED`:

| Rule | Where | Nodes |
| --- | --- | --- |
| `region` | the sign-in screen | 4 |
| `region` | the registration screen | 4 |

The auth screens render outside `AppLayout`, which is where the `<main>` is, so
every node on them sits outside a landmark. Recorded rather than fixed, the same
way `ROLLOUT` records a lint rule's outstanding violations: the fix is a change
to the app, and a sensor that cannot ship until the codebase is perfect is a
sensor that does not ship.

**`where` is required and is never a wildcard.** A rule switched off everywhere is
a rule deleted. These are switched off for one screen each, so the same rule is
still asked of every other screen — which is what found them.

The component sweep found nothing, and that is a result rather than an unrun
check: the same run names the rules it could not apply, and that list is
`NEEDS_LAYOUT` above.

One thing worth recording about the first run: the component sweep's initial four
"violations" in `CommandPalette` — an unnamed dialog, an empty heading, an
unnamed option, an unlabelled combobox — were all a fixture passing the wrong
prop names, not the component. That is the layer working as intended. axe reads
what was rendered, so a test that renders the wrong thing gets told so.

## Adding to it

- A new exported component is a new entry in the `RENDERS` table in
  `packages/ui/src/test/a11y.test.tsx`. A test there holds the table against the
  package's exports, so leaving one out fails rather than passing quietly.
- A new screen is a new entry in `SCREENS` in `apps/web/src/test/a11y.test.tsx`.
- A violation that is not being fixed now is an entry in `RECORDED` with `where`,
  a count, and a reason that is an argument. Deleting it when it is fixed is one
  line in a diff.
- A rule switched off for one render, rather than recorded, goes in that test's
  `disable` with the reason at the call site.
