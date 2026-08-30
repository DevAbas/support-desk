# eslint-plugin-harness

The defects this codebase produces, written down as rules.

Every rule here comes from a defect that was recorded during six measurements of
what a coding agent produced in this repository. None of them is hypothetical,
none of them is a style preference, and — this is the part worth sitting with —
none of them was caught by anything. They type-check. The tests pass. They look
right in a screenshot. A reviewer reading a 400-line diff does not notice that
`text-2xl font-semibold text-fg` is the sixth copy of a page title.

`packages/ui/README.md` states most of these rules in prose and says so:
"there is deliberately no lint rule enforcing any of what follows. These are the
rules; holding to them is a matter of reading them." That worked for a human who
had read the file. It did not work for anything else. This plugin is the part of
that document a machine can hold you to.

## Two configs, because there are two readers

```js
// eslint.config.js
const strict = process.env.CI === 'true' || process.env.HARNESS_STRICT_LINT === '1'

extends: [strict ? harness.configs.strict : harness.configs.recommended]
```

| Config | Severity | Who it is for |
| --- | --- | --- |
| `recommended` | warnings, never blocking | a human with the file open, mid-edit |
| `strict` | errors, fails the build | CI, and agents |

```
npm run lint          # recommended
npm run lint:strict   # strict, locally
```

CI gets `strict` automatically through `CI=true`.

**The reasoning: an agent has no excuse for violating a stated rule, a human
mid-edit does.** An agent read the rule in the same context window it wrote the
code in. It is not halfway through a thought, it has not left a `<div>`
unfinished while it goes to check something, and it will not be interrupted. A
human writing a component has all three, and a rule that fails their build
while they are still typing is a rule they will learn to run with `--fix` or
turn off. Warnings for the reader who is still working; errors for the reader
who has already stopped.

## Messages

Every message is one or two sentences: what to use instead, where it lives, and a
pointer back here. A length cap is part of the test suite.

Getting there took a wrong turn worth recording. The first version of these rules
put the whole argument in the message — the reason, the history, the guidance for
when the rule is wrong. Each one read well on its own. Then a lint run printed the
same four-line paragraph ten times, once per `no-raw-type-classes` violation, and
the output was unreadable. The one thing a message is for, telling you what to
type, was buried in an essay the reader had already skipped nine times.

> **Too little**
>
> ```
> Unicode glyphs are not allowed in JSX text.
> ```
>
> Says you did something wrong, and nothing else.

> **Too much**
>
> ```
> Use the Icon primitive from @harness-sample/ui instead of the glyph "×" —
> `<Icon name="close" label="Close" />`, naming it from the IconName union. An
> icon carries its own size scale and colour; a text character inherits both
> from the type around it, and a screen reader announces it as a word
> ("multiplication sign"). If this character is genuinely text, move it into a
> string literal or an attribute — this rule reads only JSX text, so copy in
> other languages is unaffected.
> ```
>
> Every clause true, and unreadable by the fifth copy.

> **Right**
>
> ```
> Use the Icon primitive from @harness-sample/ui instead of the glyph "×", named
> from the IconName union — or, if it is genuinely text, move it into a string
> literal. See internal/eslint-plugin-harness/README.md.
> ```

What earns its place in a message: the placeholder naming the actual offender,
the replacement, the import path a reader acts on, and a pointer here. Everything
else — the why, the history, the exemptions, when the rule is wrong — lives in
the rule's docblock and in this file, which are read once instead of once per
violation.

The threshold rules keep one clause more, that raising the threshold is a fair
answer, because a reader who does not know that will reach for an
`eslint-disable` instead. See [Thresholds](#thresholds).

## Rollout

Nothing was fixed in the change that added this plugin — it is the rules only —
so each rule ships at the level the codebase can currently pass. A rule with
outstanding violations stays at `warn` in `strict` too, because a config nobody
can turn on is a config nobody turns on.

Promotion is one edit to `ROLLOUT` in `src/index.js`, visible in a diff.

| Rule | Violations today | `recommended` | `strict` | Ready to promote |
| --- | --- | --- | --- | --- |
| `no-glyph-icons` | 3 | `warn` | `warn` | when the count reaches 0 |
| `no-raw-type-classes` | 0 | `warn` | **`error`** | promoted |
| `no-primitive-class-copying` | 0 | `warn` | **`error`** | promoted |
| `harness/max-lines-per-function` | 0 | `warn` | **`error`** | promoted |
| `harness/complexity` | 0 | `warn` | **`error`** | promoted |
| `harness/max-depth` | 0 | `warn` | **`error`** | promoted |
| `harness/max-params` | 0 | `warn` | **`error`** | promoted |
| `@typescript-eslint/no-deprecated` | 2 | `warn` | `warn` | when the count reaches 0 |

The four counting rules are at zero because their thresholds were chosen to put
them there — see [Thresholds](#thresholds) below. That is the ratchet's starting
position, not a clean bill of health.

`no-raw-type-classes` is the first rule to reach zero the other way, by the
violations being fixed, and it is now an error in `strict`. The order that
happened in is the part worth keeping: its scope was widened *first*, from
`apps/web/src/features` to the whole of `apps/web/src`, which took the count from
three to five before it went to zero. A rule promoted at three would have been
promoted while blind to two.

Today `npm run lint` and `npm run lint:strict` print the same thing, because
every rule that is an error in `strict` is already clean. That is the intended
state: `strict` is the tier that starts failing the moment someone reintroduces
one of these.

---

## `no-glyph-icons`

**A Unicode character standing in for an icon.**

Five of these were written across four measurements: a pencil and a cross in the
saved views sidebar, a cross again in `Modal` and in `Drawer`, and the three
arrows in `StatCard`. Nothing caught any of them.

A glyph takes its size and its colour from the type around it, so it is not on
the icon scale and cannot be put on it — the close cross in a dialog title grew
and shrank with the title. And a screen reader reads it as a word: the back link
on the ticket screen announced itself as "left arrow, Back to tickets".

```tsx
// Bad
<button type="button" onClick={onClose}>&#215;</button>
<span>↑ {change.label}</span>

// Good
<button type="button" aria-label="Close" onClick={onClose}>
  <Icon name="close" label="Close" decorative />
</button>
<Icon name="arrow-up" size="sm" label="Up" decorative />
```

`Icon` is sized from the spacing scale rather than from the text beside it, and
`label` is required, so an icon cannot be rendered without someone having decided
what it says. The name comes from the `IconName` union, which means an unwired
name is a compile error rather than a blank square.

Only JSX text is read. A non-ASCII character in a string literal or an attribute
is prose — the ellipsis in `'Loading…'`, an en dash between two page numbers, a
customer's name — and prose in other languages has to stay writable. That is also
the escape hatch the message points at.

**The three violations left are all prose, not icons**: two ellipses in
`Loading customer…` / `Loading ticket…`, and a middot between two facts on the
ticket detail screen. The rule cannot tell typographic punctuation from a glyph
and does not try to; the fix is to move each into a string literal, which is
where the rule stops looking.

## `no-raw-type-classes`

**A raw Tailwind size or weight where a semantic level belongs.**

Six screens hand-built their own page title before `Heading` existed, and did it
the same way each time: `text-2xl font-semibold text-fg`, three classes
reassembled from scratch at every call site. A seventh invented a level of its
own. Nothing was broken and nothing could be restyled, because there was no name
for the thing being restyled.

The semantic scale is `text-title`, `text-section`, `text-subsection`,
`text-body`, `text-caption`. Each carries its own line height, and the three
headings carry their weight — which is why a heading never also needs
`font-semibold`.

```tsx
// Bad
<h1 className="text-2xl font-semibold text-fg">Tickets</h1>
<p className="text-xs text-fg-subtle">{formatDate(comment.createdAt)}</p>

// Good
<Heading level="page">Tickets</Heading>
<Text size="caption" tone="subtle">{formatDate(comment.createdAt)}</Text>
```

Flagged: `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`,
`font-semibold`. Variant prefixes do not hide them — `md:text-lg` and
`hover:!text-sm` are the same class.

**Scope.** The whole of `apps/web/src`, and `packages/ui/src`. `apps/api` and
`packages/shared` are out and stay out: neither renders anything, so a `text-`
class there is a string that happens to look like one.

It was `apps/web/src/features` when the rule was written, because that is where
the copies were found and, at the time, very nearly the whole of the app. `app/`
now holds `AppLayout`, `AppRoutes` and the shell the auth routes render outside
of, and none of it was being read — the wordmark in `AppLayout` was
`text-base font-semibold`, a level reassembled out of a size and a weight, which
is the exact defect this rule exists for, sitting two directories from where it
was looking. **A scope drawn around where the defects happened to be found goes
stale the first time a directory is added**, and the rule reports zero for the
part it cannot see, which reads the same as clean.

Widening it surfaced two violations, both on that one line. The five that
resulted are all fixed: the wordmark takes `text-section` directly (a `Heading`
there would put an `h2` above every page's `h1`), the total in
`ReportAssigneeTable` takes `font-medium`, which is what this codebase means by
an emphasised line that is not a heading, and two `text-xs` meta lines take
`text-caption`.

**Exemptions**, which live in `src/rules/no-raw-type-classes.js` and not in
`eslint.config.js`, so that the reason travels with the rule and a new one has to
be argued for in a diff to that file. Each is one file and only the classes that
file has a reason for; a new raw size in an exempted file is still a violation,
and both halves of that are tested.

| File | Classes | Why |
| --- | --- | --- |
| `primitives/Avatar/Avatar.tsx` | `text-xs` `text-sm` `text-lg` | Initials are not type. They are a mark inside a circle of a fixed size and they scale with the circle — `size-8` takes `text-xs`, `size-14` takes `text-lg`. A semantic level would tie the mark to the prose scale and break the fit at two of the three sizes. |
| `components/Table/Table.tsx` | `font-semibold` | `text-caption` deliberately carries no weight: only the three heading levels do. A column header is a label rather than a heading, so the weight is added on top of the semantic size instead of replacing it. |

**The Table exemption is the one to revisit, and widening the scope is what
showed it.** Its reason is not about `Table` — it is that the type scale has no
way to say "emphasis on something that is not a heading", so a label needing
weight has to reach past the scale. That need is not confined to a column header:
the total in `ReportAssigneeTable` and the wordmark in `AppLayout` are the same
request, and they were both found outside `packages/ui`. Two of the three are
answered by `font-medium`, which this rule does not flag and which the whole
codebase already uses for exactly this; the third is a column header at 600.
Either the scale grows a named non-heading weight and the exemption goes, or the
exemption is admitted to be about the scale rather than about `Table` and is
written that way. What it should not become is a third per-file entry, and it
should certainly not become a line in `eslint.config.js`, where it would read as
a file somebody had trouble with rather than as a hole in the scale.

## `no-primitive-class-copying`

**A raw element wearing a primitive's class string.**

Four separate components drew a card header or a card footer by hand rather than
importing `CardHeader` and `CardFooter` — `Modal`, `Drawer` and `ReportToolbar`
among them. Each was a `<div>` carrying the same border, the same padding and the
same flex row, retyped. Nothing was broken. Nothing could be changed either, because changing
the card scale meant finding four copies and hoping that was all of them.

```tsx
// Bad
<div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
  <h2 className="text-section text-fg">{title}</h2>
  <Button onClick={onClose}>Close</Button>
</div>

// Good
<CardHeader title={title} actions={<Button onClick={onClose}>Close</Button>} />
```

Matched combinations, most specific first:

| Combination | Primitive |
| --- | --- |
| `border-b border-border px-5 py-4` | `CardHeader` |
| `border-t border-border px-5 py-3` | `CardFooter` |
| `px-4 py-12 text-center` | `StateMessage` |
| `px-5 py-4` | `CardBody` |

**This rule is a heuristic, and it says so in its message and its docblock.** It
matches appearance, not intent. A toolbar is also a bordered strip across a card
and is genuinely not a `CardHeader`: a header says what a card is and pads to the
card scale, a toolbar acts on it and sits on the tighter scale a table cell uses
— which is why the rule matches on the card scale rather than on "a strip with a
border".

`TicketsToolbar` was the example here, and it was described as correct as it
stands. It is not a `CardHeader` and never was, but "correct as it stands" was
the wrong conclusion: it was one of six strips hand-writing the same padding
under the same border, and a `Toolbar` primitive now owns all six. The
distinction the rule draws was right; what it was protecting was a copy the rule
had no signature for.

**Two things about the signature table are worth knowing before anyone trusts
this rule's zero.** The combinations above are the card scale as it was when they
were written — `px-5 py-4` and `px-5 py-3`. A density pass has since moved
`CardHeader` and `CardBody` to `px-4 py-3` and `CardFooter` to `px-4 py-2.5`, and
these signatures were not moved with them, so the rule currently matches a scale
that no longer exists anywhere in the codebase. Its zero is a rule looking for
the wrong string, not a codebase with no copies in it. Correcting it is not free
— `px-4 py-3` is also what `Alert`'s `callout` and `band` variants are, and they
are legitimately not a `CardBody` — so it is a change with a decision in it
rather than a typo, and it is left here rather than made quietly.

Where it is still wrong, the classes are usually what to change. Where they are
right, a disable comment carrying the reason is a fair answer and a reviewable
one.

Only raw elements are matched. `<Card className="... px-5 py-4">` is composition
— `StatCard` pads a `Card` to the card scale, which is the scale used by the
thing it belongs to. The files that define `Card` and `StateMessage` are exempt,
because writing the class string is what a primitive is.

---

# Configured in `eslint.config.js`, not here

These four needed no rule written. What they needed was for someone to turn them
on and to choose a number.

## `@typescript-eslint/no-deprecated`

`type FormEvent` is deprecated in `@types/react` 19 — the deprecation notice
reads "FormEvent doesn't actually exist" — and it propagated to four files across
two measurements. Nothing caught it: `tsc` reports a deprecation as a *hint*
rather than an error, so `npm run typecheck` passes clean, and the strikethrough
is only visible on hover in an editor. An agent never hovers.

```tsx
// Bad
import { useState, type FormEvent } from 'react'
async function handleSubmit(event: FormEvent<HTMLFormElement>) { … }

// Good
import { useState, type SubmitEventHandler } from 'react'
const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (event) => { … }
```

It is a typed rule, so `eslint.config.js` turns on `projectService` for it. That
is the only typed rule enabled; the rest of the config stays syntactic.

Turning it on immediately found two more nobody knew about: `queryClient.fetchQuery`
in `useTicketsExport`, and recharts' `Cell` in `BarChart`. Six violations, all at
`warn`.

The four `FormEvent` files are migrated now, onto the `SubmitEventHandler` the
auth screens were already using. The two the rule found on its way past are what
is left, and neither is a spelling this codebase chose: `fetchQuery` is a one-line
move to `queryClient.query`, and `Cell` goes when `BarChart` moves onto recharts'
`shape` prop. Promotion waits on those two, not on anything a form does.

## Thresholds

Two measurements produced a 25-to-30 line block inside a `.map()` that was never
extracted, in files that also duplicated the row markup a second time a few lines
down. The block was a component nobody had named. Nothing flagged it, because
nothing was counting.

Each threshold is set **just above the worst function in the repository today**,
so nothing fails on day one and the next function to cross the line is a new one:

| Rule | Threshold | Worst today |
| --- | --- | --- |
| `max-lines-per-function` | 185 | 181 — `TicketListPage.tsx` |
| `complexity` | 20 | 20 — `TicketListPage.tsx` |
| `max-depth` | 3 | 2 — five files |
| `max-params` | 5 | 5 — `fail()` in `apps/api/src/app.ts` |

`complexity` and `max-params` sit exactly *at* today's worst rather than above
it. Nothing fails, and there is no headroom: the next function to exceed either
is a new one, which is the whole point. `max-lines-per-function` counts with
`skipBlankLines` and `skipComments`, so it counts code; it is off in test files,
because a `describe` block is a container and not a function anyone should
extract.

185 is a large number and it is meant to look like one. It is the ratchet's
starting position, and the honest reading of it is "this repository contains a
181-line function".

**Böckeler's technique.** Every message ends by saying that raising the threshold
is an acceptable answer:

```
'handleRowClick' has too many lines (204). Maximum allowed is 185. Extract the
block into a named function. Raising the threshold in eslint.config.js is a fair
answer and shows up in the diff, where an eslint-disable does not.
```

That is not a loophole, it is the mechanism. Given a rule that is sometimes
wrong, the useful design is the one whose escape hatch stays visible. The clause
survives the shortening because it is the part a reader cannot work out on their
own: without it, the obvious move on a rule you disagree with is to suppress it.

What to do instead of each threshold — why a lookup table keyed by a union
answers `complexity`, why depth is usually a decision tangled up with a body —
is in the docblock of `src/thresholdRules.js`.

ESLint's core rules cannot carry a custom message, so `src/thresholdRules.js`
takes each core rule and replaces `meta.messages`. The counting logic is
ESLint's, untouched — no rule was reimplemented, and the thresholds are still
configured in `eslint.config.js`, which is where the messages tell you to go.

## `dependency-cruiser`

```
npm run lint:boundaries
```

`packages/ui` must not import from `apps/` or from any feature directory.
`packages/shared` must not import from either, and must not import `packages/ui`.

This boundary is currently enforced only by package resolution: `packages/ui`
does not depend on `@harness-sample/web`, so an import of it does not resolve, so
nobody writes one. That is a real constraint right up to the moment someone adds
the dependency, or a path alias, or merges two workspaces during a restructure —
at which point the boundary is gone and no diff says so. The workspace split was
done for this; making it explicit means a future restructure cannot quietly undo
it.

`tsPreCompilationDeps` is on, so type-only imports count. `import type { Ticket }
from '@harness-sample/web'` erases at build time and leaves no trace in the
bundle, which is exactly what makes it the easy way across a boundary by
accident.

---

## Adding a rule

- One file under `src/rules`, with a docblock giving the reason it exists — the
  defect, how many times it happened, and what it cost. A rule whose reason
  cannot be written down is a preference.
- One test file under `src/__tests__`, with valid and invalid cases. Every
  exemption gets a test, and so does its narrowness: that the exempted file
  still fails for a class the exemption does not name.
- A message that names the replacement and its import path.
- An entry in `ROLLOUT` in `src/index.js` with the current violation count, and a
  row in the table above.

The plugin is plain ESM JavaScript so ESLint can load it without a build step,
which is why it is not in `tsc -b`. `npm test` runs its tests as the
`eslint-plugin-harness` project.
