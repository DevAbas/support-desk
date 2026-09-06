# class-resolution

A Tailwind class the source writes that the stylesheet cannot produce.

```
npm run build && npm run lint:classes
```

`packages/ui/src/tokens.css` resets Tailwind's radius namespace with
`--radius-*: initial` and then defines four names. Every `rounded-element` in the
tree depends on one of those four lines. Delete it and the class stays in the
string: `tsc` cannot see CSS, the tests assert the class name and the name is
still there, and no lint rule can fire, because `rounded-element` is not wrong.
It stopped resolving.

`packages/ui/src/components/Alert/Alert.test.tsx` is the shape of it. It asserts
`rounded-element` three times — once with `toHaveClass` and twice with
`not.toHaveClass` — and all three stay green with the token deleted. Both Vitest
projects run with `css: false`, so no test here has ever seen a stylesheet.

## Problem, mechanism, tool

| | |
| --- | --- |
| **Problem** | A design token is deleted or renamed. Every class built from it keeps its name, keeps compiling, keeps passing its tests, and silently produces no CSS. The only thing that noticed last time was somebody looking at a screenshot. |
| **Mechanism** | Tailwind emits a rule only for a class it can build. So the built stylesheet already holds the answer: a class the scanner saw and emitted nothing for did not resolve. Read the artifact, not the source. |
| **Tool** | Five hundred lines — 130 of them the extractor and 130 the CSS scanner — over the `typescript` compiler API, which is already a devDependency. No new dependency, and no service. |

## Why the artifact, and not a rule

A lint rule is the obvious place and it cannot work here. ESLint sees one file at
a time and never sees CSS, so a rule would have to carry its own list of the
tokens that exist — `tokens.css` written a second time, in a second language,
drifting from the first. The failure it is meant to catch *is* a drift between
two copies of the same list.

Calling Tailwind's own compiler was the other candidate: `@tailwindcss/node` can
be asked whether a candidate compiles. It is a transitive dependency of
`@tailwindcss/vite` that nothing here declares, its API is internal, and it
answers a different question — whether the class *would* compile, rather than
whether it *did*. All three defects this has found so far were in files Tailwind
never scanned, where the answer to the first question is yes and the answer to
the second is no.

`eslint-plugin-tailwindcss` reads a JavaScript config, which a v4 CSS-first theme
does not have. A snapshot of the built CSS fails on every legitimate change and
never says which class died. `postcss` would parse the stylesheet, and arrives
under `node_modules` only as something Vite depends on; `internal/duplication-check`
took the same care in the other direction, using the parser the lint pass already
loads rather than adding one.

## What "does not resolve" means, and why it is two things

A class can die on either side of the utility, and only one of the two is a
missing class.

**No rule.** The token behind the class is gone, so Tailwind emits nothing at
all. This is the `--radius-element` case, and it is what the acceptance run
below exercises.

**No value.** The rule is emitted and reads a custom property that nothing
defines. `@utility focus-ring` and `@utility interactive` copy
`var(--focus-ring-color)` and `var(--color-overlay-hover)` into their bodies
verbatim, and `--shadow-overlay` carries `var(--color-shadow)` inside its own
value. Delete any of those three and the class is still in the stylesheet,
carrying a declaration that computes to nothing — invisible to the first check by
construction. A `var()` written with a fallback is not reported: a fallback is
somebody saying what happens when the property is missing.

Measured on this checkout: 220 classes and 141 custom properties, 0 of them
dangling.

## How a class is found in the source

A class name is written in four places here and only one of them is a
`className` attribute. The others are `cn()` arguments, the module-level
`Record<Union, string>` above each primitive — which is where `Alert.tsx` keeps
`rounded-element` — and `toHaveClass`. A regex over `className="..."` sees one of
the four.

So a string literal is read as a class string when it sits in a **value
position** that produces one: the initializer of a class attribute, an argument
of `cn` / `clsx` / `twMerge` / `cx` / `toHaveClass`, or the initializer of a
variable whose name ends in `Classes`. `CLASS_CALLS` and `CLASS_VARIABLE` in
`src/index.js` are those lists.

The whole difficulty is the word *value*, and the numbers say so. Three ways of
deciding what is a class, measured against this checkout on a clean build:

| Rule | False positives | Also |
| --- | --- | --- |
| Every literal whose namespace the stylesheet knows | 45 distinct, over `apps`, `packages` and `internal` | misses `tabular-nums`, whose namespace is absent from the output entirely |
| Class position, propagated to every descendant | 31 distinct, over `apps` and `packages` | |
| Class position, propagated to values only | **0** | |

The four descents that make the difference between the second row and the third,
each of which was a real false positive before it was closed:

- not into a call's **callee**, or `expect(screen.getByRole('button')).toHaveClass(…)`
  reports `button`;
- not into an element access's **index**, or `intentClasses[change.intent ?? 'neutral']`
  reports `neutral`;
- not into a conditional's **condition**, or `variant === 'primary' && 'bg-primary'`
  reports `primary`;
- not into a **non-class call's arguments**, because the class is what that call
  returns rather than what it was handed — `cn('flex', toneFor(name))` reports the
  person's name otherwise.

## The two numbers printed beside the findings

A sensor that prints only what it found reads as covering everything, so both of
this one's blind spots are counted on every run rather than described once here.

**Spliced fragments.** `` `rounded-${size}` `` has no whole token in it. Every
fragment an interpolation runs into is counted and located. Whitespace is what
decides: in `` `flex rounded-${size} border` ``, `rounded-` is a fragment and
`flex` and `border` are classes. **0 today** — there is not one interpolated class
name in this repository, and the four `+`-concatenated base strings — in
`Button`, `Input`, `Select` and `Textarea` — all end their fragments inside the
quotes, so no token is split
across one.

**Class strings outside every position.** A literal that looks like a class list —
it holds a hyphenated class the stylesheet knows — and sits in none of the three
positions above. This is the coverage that would be lost the day somebody renames
`variantClasses` to `variantStyles`, and printing it is what makes that show up
instead of the coverage narrowing quietly. **0 today.**

Neither number fails the check. They are measurements, and a rising `outside` is
an argument for widening `src/source.js`, which shows up in a diff.

## Where it runs

CI only, as a step after `Build` — which the gate did not have at all until this
sensor needed it, so nothing automated had ever compiled this repository's
stylesheet. It cannot run in `.claude/hooks/check-file.mjs` with the other fast
checks, because it needs a build first, and the hook's budget is one file and a
second or so.

The check itself is 0.3s over 276 files; `npm run build` ahead of it is about a
second warm. It refuses to read a stylesheet older than the newest file that
feeds it and says which two files those are, because the one thing worse than not
running is confidently answering a question about a checkout that no longer
exists.

## What the first run found

Three classes over seven sites, none of them a deleted token.

| Class | Sites | What was wrong on screen |
| --- | --- | --- |
| `text-right` | 4, in `apps/web/src/features/reports/components/ReportAssigneeTable.tsx` | every numeric column left-aligned |
| `tabular-nums` | 2, in the same file | figures not tabular, so the columns did not line up |
| `xl:grid-cols-4` | 1, in `apps/web/src/features/reports/components/ReportSummaryCards.tsx` | the summary grid never reached four columns |

The cause was one character. `.gitignore` carried a bare `reports`, for Stryker's
output at the repository root — and an unanchored pattern matches a directory of
that name at any depth, so it also matched `apps/web/src/features/reports`.
Tailwind's source scanner honours `.gitignore`, so the entire Reports feature was
invisible to it and any class used only there was compiled away without an error.

It arrived in `eb514d4`, the commit that added the sensor layer, and none of the
five sensors in that commit could see what it broke. **Fixed on this branch**, by
anchoring all three patterns; the comment in `.gitignore` says why they are
anchored, so the next tidy-up does not undo it.

The file list here comes from `git ls-files` rather than from a walk of the
filesystem for exactly this reason. A walk that honoured `.gitignore` would go
blind in the same places Tailwind is blind, which is where the defect lives.

## The acceptance run

Delete `--radius-element` from `packages/ui/src/tokens.css`, build, and the check
names **14 sites over 12 files** — the four components in `apps/web`, the four
primitives, `Alert.tsx`, `BarChart.tsx`, `MultiSelect.tsx`, and all three
assertions in `Alert.test.tsx`. Put it back, build, and it reports nothing.

`rounded-element` is written in 14 tracked files over 18 lines. The other four
lines are prose — two in a docblock in `packages/shared/src/cn.ts` and two in
`packages/ui/README.md` — and are the first limitation below rather than a miss.

## Known limitations

**Prose is not read.** A class named in a comment or in Markdown is not checked,
and there are four such lines. `apps/web/src/index.css` already decided this for
Tailwind, with `@source not` and eight lines saying why: the design system README
quotes the classes it forbids, and reading those as usage would compile them in.
Stale citations are `doc-path-exists` and `doc-symbol-exists`'s subject, next
door.

**The `*Classes` naming convention is load-bearing.** It is how thirty constants
across `apps/web` and `packages/ui` are found — every `baseClasses`,
`variantClasses`, `toneClasses`, `controlClasses` and the rest. Rename one and its
classes stop being read, which is what the `outside` count exists to say.

**A class built from an expression cannot be checked.** Counted, not ignored, and
0 today.

**Only `.ts`, `.tsx`, `.js` and `.jsx` are parsed.** `apps/web/index.html` is
scanned by Tailwind and not by this; it carries no classes today.

**`internal` is out of scope.** Nothing there is compiled into the stylesheet, so
a class written in a harness tool has nothing to resolve against, and the lint
plugin's fixtures deliberately name classes that are not supposed to exist —
`px-5 py-4` is `CardHeader`'s signature in `no-primitive-class-copying.js`.
Measured, including it would report **0** either way today, because those
fixtures are JSX inside plain string literals and a string literal is not a class
position. That is a thin margin rather than a guarantee: a fixture written with
`cn()` would report. The cost of the exclusion is 0 sites and the reason is that
the answer there would not mean anything.

**A custom property defined anywhere counts as defined everywhere.** One set only
inside a media query reads as available outside it. The defect this exists for
leaves a token defined in no scope at all.

**It does not check the other direction.** A class the stylesheet defines that
nothing uses is invisible here, and there are two: `rounded-inner` and
`rounded-page` are declared in `tokens.css`, named in the design system README's
radius table, and used by no component. That is the opposite question and it
wants a different tool.

**It cannot see a class that resolves to the wrong value.** `--radius-element`
changed from `0.1875rem` to `2rem` is a rule, a declaration, and a visible
regression this reports nothing about.

## Adding to it

Same shape as the two harness tools beside it:

- An entry in `RECORDED` in `src/index.js` for a class that produces no CSS and
  is not being fixed now, with a `reason` that is an argument rather than a
  label. An entry covers one class in one file, so recording four sites in one
  component does not quietly cover a fifth somewhere else.
- Deleting that entry when the class resolves again. The check fails until you
  do, because a stale entry is a claim nobody has re-read.
- A widening of the class positions in `src/source.js` when `outside` stops being
  0, and a test for it under `src/__tests__`.
- A row in the limitations table above for anything it still cannot see, with the
  number.
