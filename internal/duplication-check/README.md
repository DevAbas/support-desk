# duplication-check

A file written by copying another and changing the names.

```
npm run lint:duplication
```

Nothing else here detects one. `tsc` type-checks both halves, the tests cover
both halves, the lint rules read both halves, and a reviewer reads a diff in
which every line is new. What it costs is paid later, by whoever has to find all
the copies to change one thing — and the whole argument of this repository's
harness is that the cost lands on someone who was not in the room when the copy
was made.

## Problem, mechanism, tool

| | |
| --- | --- |
| **Problem** | A file is written by copying another and changing the strings in it. Review sees a new file. Every later fix has to be made twice, and the second one gets missed. |
| **Mechanism** | The copy differs from the original in its names and its literals but not in its shape. Erase identifiers and literals and the two files are the same sequence of syntax. |
| **Tool** | Fifty lines over `@typescript-eslint/parser`, which the lint pass already loads. No new dependency, and the threshold and the exemptions are in this directory rather than in somebody's dashboard. |

## Why not jscpd

jscpd is the obvious answer and it cannot see this class of defect at all.

Its three modes are `strict`, `mild` and `weak`, and from `@jscpd/core`'s own
`mode.ts` they differ only in which token **types** they drop:

```js
function strict(token) { return token.type !== 'ignore' }
function mild(token)   { return strict(token) && token.type !== 'empty' && token.type !== 'new_line' }
function weak(token)   { return mild(token) && token.format !== 'comment' && token.type !== 'comment' }
```

None of them normalises an identifier or a string, and the hash is over token
*values*. Renaming `ticket` to `customer` while copying is therefore enough to
make a copy invisible to jscpd in every mode it has.

Measured on this repository, longest shared run per pair, with jscpd's default
`minTokens: 50`:

| Pair | Identifiers intact (what jscpd hashes) | Identifiers erased | jscpd verdict |
| --- | --- | --- | --- |
| `useBulkDeleteTickets` / `useBulkDeleteCustomers` | 28 | **117 of 117 — the whole file** | silent |
| `ticketsCsv` / `customersCsv` | 33 | 76 | silent |
| `SavedViewNameDialog` / `TicketMoveReasonDialog` | 39 | 55 | silent |
| `Input` / `Textarea` | 112 | 116 | **reported** |
| `LoginPage` / `RegisterPage` | 86 | 115 | **reported** |

The two it reports are a pair of primitives and a pair of screens that are
parallel on purpose. It inverts the signal and the noise.

`jsinspect-plus` has the right mechanism — AST shape, identifiers ignored — and
was rejected for two smaller reasons: it depends on a beta release of
`@babel/parser`, and it thresholds on an absolute node count, which is the
measurement that does not work here.

## Why the threshold is a proportion

Every tool in this space thresholds on the *size* of the largest clone. On this
repository that cannot work, and the third column above says why: **the largest
structural clone in the tree belongs to a pair that is correct.** `Input` shares
116 nodes with `Textarea`; `useBulkDeleteTickets` shares 117 with its copy. Any
absolute threshold clearing the first clears the second.

What separates them is not how much is shared but how much of the file it is.
`useBulkDeleteTickets` is a copy — there is nothing else in it. `Input` has a
construction in common with `Textarea` and then most of a component of its own.

So the number is the share of each file's syntax that also appears in the other,
and the threshold is on the smaller of the two:

| Setting | Value | What it means |
| --- | --- | --- |
| `WINDOW` | 25 nodes | Below this a shared run is coincidence. Every module has an import list; every component has a return. |
| `MIN_SHARE` | 0.85 | Most of one file is the other file. |

Both are in `src/index.js`, and raising either is a fair answer that shows up in a
diff — the same technique the lint rules' messages point at.

## The recorded list is the ratchet

This repository is deliberately two of everything. Tickets and customers are
built unalike on purpose and built in parallel anyway, so a threshold set high
enough to clear the parallelism would clear everything.

So every pair over the line today is written down in `RECORDED` in `src/index.js`
with the reason it is there, exactly as `ROLLOUT` records a lint rule's
outstanding violations. Twelve pairs, of two kinds:

- **`parallel`** — a shape two files share because the design asked for two of
  them. Collapsing one of these would be the defect. Nine today: the three domain
  badges, the four query hooks, the typed fetchers, and the variant lookup that
  `Toolbar` and `Badge` are both mostly made of.
- **`duplication`** — a copy nobody has collapsed. Three today, recorded rather
  than fixed so that this sensor could ship without a refactor riding along
  inside it:

  | Pair | Share | The missing abstraction |
  | --- | --- | --- |
  | `useBulkDeleteCustomers` / `useBulkDeleteTickets` | 100% | one `useBulkDelete` taking the key factory |
  | `useSignIn` / `useSignUp` | 100% | one credential mutation, in the same directory |
  | `customersCsv` / `ticketsCsv` | 87% | a builder around the quoting already shared in `lib/csv.ts` |

**A pair not on the list fails the check. A pair on the list that is no longer
over the line also fails it**, because a stale entry is a claim nobody has
re-read, and deleting it is the one line in a diff that says a copy was
collapsed.

## Known limitations

**A partial copy is invisible, and one of them is real.** The threshold reports a
file that is mostly another file, and says nothing about a file that was copied
and then half rewritten. Measured, at `MIN_SHARE = 0.85`:

| Pair | Share | Seen? |
| --- | --- | --- |
| `SavedViewNameDialog` / `TicketMoveReasonDialog` | **48%** | no |
| `CommentList` / `TicketHistoryCard` | 14% | no |
| `savedViews.ts` (tickets) / `savedViews.ts` (customers) | 20% | no |
| `Modal` / `Drawer` | 19% | no |

The first of those is a genuine finding this tool is set too high to make: half
of each file is the same shape, down to a verbatim shared comment, and a
`PromptDialog` is the abstraction neither has. The last three are correctly
quiet — two of them are one mechanism configured twice, and `Modal` and `Drawer`
share a `Dialog` rather than each other. **The threshold cannot tell those four
apart**, and lowering it to catch the first surfaces roughly fifty pairs, which is
a list nobody reads. That is the trade, stated rather than hidden: this sensor
catches whole-file copies and leaves partial ones to review.

Those four numbers are pinned in `src/__tests__/run.test.js`, so a change to the
threshold that quietly moves any of them across the line fails a test rather than
going unnoticed.

**It compares files, not functions.** A block copied from one big file into
another big file moves neither file's share much. `CommentList` and
`TicketHistoryCard` are exactly that — roughly twenty-two lines written out twice,
and the code says so itself in a comment — and the check is silent.

**Shape, not meaning.** Two files that do the same job in different constructions
— a `for` loop against a `.reduce()` — are not a pair here, and should not be.
Two files doing genuinely different work through a common skeleton are, which is
what nine of the twelve recorded entries are.

**Only `apps/` and `packages/`, and only `.ts`/`.tsx`.** Tests are excluded,
because a test's fixtures are strings rather than a copy anybody has to maintain
twice, and `index.ts` barrels are excluded because they are two lines.

**It fails on an unparseable file rather than skipping it.** A file the lint pass
can read is a file this can read; if that stops being true, the check says so
instead of quietly measuring less of the tree.

## Adding to it

Same shape as the lint plugin next door:

- An entry in `RECORDED` in `src/index.js`, with `kind` and a `reason` that is an
  argument rather than a label. `parallel` says the design asked for two;
  `duplication` says it is a copy and names the abstraction that is missing.
- Deleting an entry when the copy is collapsed. The check fails until you do.
- A test under `src/__tests__` for anything about the measurement that changed,
  and a row in the limitations table for anything it still cannot see.
