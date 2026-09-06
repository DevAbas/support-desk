# Support Desk

A small support-tickets admin panel built on its own design system. It exists as a
reference codebase for a video series on harness engineering for frontend projects.

It started as a repo whose point was what it *did not* have: no `AGENTS.md`, no
lint rule that enforced the design system, no machine-readable guidance at all. The
rules were written in prose in [`packages/ui/README.md`](packages/ui/README.md), and
nothing forced anyone — human or agent — to read them.

The harness is what has been added to it since, one layer at a time, each one
answering a defect that the last layer could not see:

| Layer | What it constrains | Where it lives |
| --- | --- | --- |
| Primitives and tokens | what there is to reach for | `packages/ui` |
| Lint rules and boundaries | what can be written | `internal/eslint-plugin-harness`, `.dependency-cruiser.cjs` |
| AGENTS.md | the decisions no tool can check | `AGENTS.md` |
| **Sensors** | **whether what was written does what it claims** | see [Sensors](#sensors) |

The first three constrain the writing. None of them asks whether the result is
correct, accessible, original or honestly described, which is what the fourth is
for.

## Stack

React 19, TypeScript (strict), Vite, Tailwind CSS v4, React Router, TanStack Query,
zod, Hono, Vitest with React Testing Library and MSW, ESLint. No component library.

## Running it

```bash
npm install
npm run dev
```

`npm run dev` starts two processes: the API on port 8787 and Vite on 5173, which
proxies `/api` to it.

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the API and the dev server together |
| `npm run dev:api` | Start the API alone |
| `npm run dev:web` | Start the dev server alone |
| `npm run build` | Typecheck and build for production |
| `npm run typecheck` | Typecheck only |
| `npm run lint` | ESLint, warnings only |
| `npm run lint:strict` | ESLint with the rules CI enforces as errors |
| `npm run lint:boundaries` | dependency-cruiser: the workspace boundaries |
| `npm run lint:duplication` | Structural duplication: files copied and renamed |
| `npm run lint:classes` | Classes in the source that the built stylesheet cannot produce |
| `npm run test` | Run the test suite once |
| `npm run test:watch` | Run the test suite in watch mode |
| `npm run test:mutation` | Stryker: whether the tests would notice the code being wrong |
| `npm run test:mutation:fast` | The same, over a smaller test surface — five minutes rather than eighty |

`lint` and `lint:strict` run the same rules at two severities. `internal/eslint-plugin-harness`
holds the ones specific to this codebase, and its README says what each is for
and why — every one of them comes from a defect that was recorded here more than
once and caught by nothing.

`lint:duplication`, `lint:classes` and `test:mutation` are the three sensors that
are not lint rules; `internal/duplication-check/README.md`,
`internal/class-resolution/README.md` and `stryker.config.json` say what each
measures and what it cannot. `lint:classes` reads the built stylesheet, so it
wants a `npm run build` in front of it and says so rather than reading a stale
one. None is a check you should have to remember: the fast ones run after every
file an agent writes, and all of them run in CI. See [Sensors](#sensors).

## Sensors

The primitives, the lint rules and `AGENTS.md` all constrain what gets *written*.
Nothing checked whether what was written does what it claims. These six do, and
each one exists because there is a class of defect that passes `tsc`, passes the
tests, passes the lint pass and passes review.

| Sensor | The failure it catches | Tool |
| --- | --- | --- |
| Mutation testing | A test runs a line, asserts nothing that pins it, and the line reports as covered. | Stryker, `stryker.config.json` |
| Accessibility, static | ARIA written but not wired, where the source is what shows it. | Two rules in `internal/eslint-plugin-harness` |
| Accessibility, rendered | The same, where only the DOM shows it. | axe-core, `internal/a11y` |
| Duplication | A file written by copying another and changing the names. | `internal/duplication-check` |
| Document freshness | Prose beside code that the code has moved out from under. | Two rules in `internal/eslint-plugin-harness` |
| Class resolution | A class name the source still writes, after the token it was built from stopped existing. | `internal/class-resolution`, over the built stylesheet |

Each has a README or a config comment saying what it catches, what it cannot, and
what was found on its first run. Those limitation sections are the load-bearing
part: a sensor whose blind spots are undocumented gets read as covering
everything.

### Where each one runs, and why there

A check is worth what it costs to act on, and that cost is set by when it
arrives. There are two moments here and they take different checks.

| Check | Agent hook | CI | Why |
| --- | --- | --- | --- |
| `tsc -b` | ✔ | ✔ | Incremental; a quarter of a second warm |
| `eslint <file>` | ✔ | ✔ | ~1.3s for one file, 5s for the tree |
| `npm test` | | ✔ | 12s, 703 tests. Too slow per write, too fast to skip on merge |
| `lint:boundaries` | | ✔ | Whole module graph; meaningless for one file |
| `lint:duplication` | | ✔ | Cross-file by definition — a copy needs both halves |
| `npm run build` | | ✔ | A second, and the only thing that produces a stylesheet to check |
| `lint:classes` | | ✔ | 0.3s, but it reads the build above; nothing in a hook can afford one |
| `test:mutation` | | ✔ | 81 minutes: it runs the suite once per mutant |

**The fast two run in the agent's own loop**, from a `PostToolUse` hook in
`.claude/settings.json` that calls `.claude/hooks/check-file.mjs` after every
Write or Edit. An agent that finishes a task and hands back work that does not
compile has already stopped; somebody reads the failure, comes back, and pays for
a second trip through a context that has moved on. The same failure delivered one
tool call after the file was written is a correction the agent makes itself,
while it still remembers why it wrote the line.

The hook runs the **strict** tier, because `internal/eslint-plugin-harness/README.md`
already decided that: "an agent has no excuse for violating a stated rule, a human
mid-edit does". Warnings do not block at either tier — a warning is a rule the
codebase has not caught up with, recorded in `ROLLOUT`, and stopping an agent on
one would teach it to fix somebody else's backlog mid-task.

**Everything slow runs in CI**, in `.github/workflows/ci.yml`. That file also
closes a gap that had been open for four commits: `eslint.config.js` promotes
every rule to an error when `process.env.CI === 'true'`, and there was no CI to
set it, so the strict tier had never once run.

### Why there is no commit hook

A commit hook is the obvious third place and it is the wrong one here, for two
reasons.

**It would not show up in a diff.** A `pre-commit` hook lives in `.git/hooks/`,
which is not tracked — so nobody reviews it, and a fresh clone silently has no
gate. That is exactly the failure this whole harness is built against. Making it
tracked means adding husky or lefthook: a dependency whose entire job is to
re-run, once, checks that CI is about to run anyway.

**And the timing is wrong for the reader it would be for.** Nothing here commits
during the work. An agent writes twenty files and commits at the end, if at all,
so a pre-commit check fires after everything is already written — which is the
moment the `PostToolUse` hook exists to beat. It would turn a correction the
agent makes mid-task into a wall of failures at the point it was trying to stop.

If this repository ever grew a workflow where a human commits repeatedly through
a change, the argument would be worth revisiting. It does not have one.

### What none of them see

Worth stating plainly, because six green checks read as more than they are.

- **Anything visual.** jsdom has no layout, so colour contrast, focus visibility,
  target size and reflow are unchecked here and unchecked anywhere else in this
  repository. `internal/a11y/README.md` names the rules this rules out.
- **Whether prose is *true*.** The document rules check that a path resolves and
  that a name is declared. A sentence that cites nothing and is simply wrong is
  invisible, and that is most of the category.
- **A partial copy.** The duplication check reports a file that is mostly another
  file. One real finding sits below its threshold, measured and named in
  `internal/duplication-check/README.md`.
- **A defect in a test fixture.** Mutation testing mutates source. Where a
  fixture's own shape makes a branch unreachable, no mutant can surface it — and
  this repository has an instance, recorded below.
- **Whether any of it is usable.** axe finds violations of rules. A screen can
  pass every rule and still be impossible to work through.
- **A class that resolves to the wrong value.** The class check asks whether a
  class produces a declaration, not whether the declaration is right.
  `--radius-element` changed from `0.1875rem` to `2rem` is a visible regression it
  reports nothing about, and so is a class named only in prose:
  `internal/class-resolution/README.md` has both, with the counts.

### What the first run of each found

Recorded rather than fixed, except where noted, so that the sensors could ship
without a refactor riding along inside them.

| Sensor | Found | Status |
| --- | --- | --- |
| `require-list-role` | 4 lists laid out with `flex` and no `role="list"` | fixed on this branch |
| `doc-path-exists` | 6 dead path citations, 5 in the root README | fixed on this branch |
| `aria-modal-needs-focus-trap` | 0 | ratchet |
| `doc-symbol-exists` | 0 of 25 citations unresolved | ratchet |
| axe, screens | `region` on the two auth screens: they render outside `AppLayout`, so outside any landmark | recorded in `internal/a11y` |
| axe, components | 0 | — |
| Duplication | 12 pairs over the line; 3 of them real copies | recorded in `internal/duplication-check` |
| Class resolution | 3 classes over 7 sites producing no CSS, all in the Reports feature, all from one unanchored `.gitignore` pattern | fixed on this branch |
| Mutation | see below | recorded |

### The mutation score, and what it found

`npm run test:mutation` changes the code to be wrong — flips a comparison, empties
a block, replaces a string — and reruns the tests. A change no test noticed is a
line nothing was actually checking. Coverage asks whether a line ran; this asks
whether anything would have minded it being wrong, which is the question a
coverage percentage cannot ask and is routinely read as answering.

Scoped to `packages/shared` plus the two files in `packages/ui` that are logic
rather than markup. **487 mutants, 84.39% killed** on the first clean run, and the
threshold is set from that rather than chosen: `break: 82`, with two points of
slack because a few mutants in `workflow.ts` time out rather than being killed
outright and a timeout scores as a kill.

It costs **81 minutes**, at ~77 tests per mutant, because `packages/shared` is
imported by very nearly every file in `apps/web`. That is a CI job of its own and
it is not something to wait for while working, so there is a second tier beside
it — `npm run test:mutation:fast`, the same mutants against `api`, `shared` and
`ui` but not `web`, in **five minutes**. Two tiers of one check for two readers,
which is what `lint` and `lint:strict` already are.

**What the fast tier costs is measured, not assumed: 77.21% against 84.39%**, and
`vitest.mutation.config.ts` has the per-file delta. It is worth reading, because
the seven points are not spread evenly — `types.ts` goes from 100% to 33% and
`navigation.ts` from 57% to 43%, while `reports.ts` and `contract.ts` do not move
at all. Those two files are mostly *labels*, which are rendered and never served,
so no API test can see them being wrong. The guess when that config was written
was that the web tests were redundant; the numbers said otherwise, and they are
in the file because a proxy whose error nobody has measured is just a smaller
number.

| File | Score | Survived |
| --- | --- | --- |
| `types.ts` | 100.00 | 0 |
| `workflow.ts` | 96.73 | 5 |
| `reports.ts` | 93.33 | **2** |
| `search.ts` | 93.33 | 1 |
| `customers.ts` | 93.02 | 3 |
| `auth.ts` | 92.31 | 1 |
| `contract.ts` | 88.24 | 6 |
| `TabsContext.ts` | 90.00 | 1 |
| `useFocusTrap.ts` | 68.75 | **22, and 3 unreachable** |
| `cn.ts` | 63.16 | 7 |
| `navigation.ts` | 56.90 | 25 |

Two of those survivors are the reason this sensor exists, and **neither is fixed
on this branch**: they are the evidence that it works, and a sensor shipped with
nothing to catch has never been seen catching anything. Both are recorded here
for a separate change.

**`reports.ts:49` — a defect on a line reported at 100% statement coverage.**

```
-  return (Date.parse(range.to) - Date.parse(range.from)) / DAY_IN_MS <= MAX_REPORT_RANGE_DAYS
+  return (Date.parse(range.to) - Date.parse(range.from)) / DAY_IN_MS < MAX_REPORT_RANGE_DAYS
```

The range is inclusive at both ends — the file's own docstring says so — so its
length in days is the difference plus one. The `+ 1` is missing, and the correct
version of the same expression is eleven files away in
`apps/web/src/features/reports/reportRanges.ts`. A 367-day range is accepted by a
validator whose error message says the limit is 366. The line is executed on three
API routes; the only test that touches it uses a range of about 912 days, so
nothing pins the boundary, and `<=` → `<`, `366` → `365` and `366` → `367` all
survive. The sibling predicate on line 45 has the same hole in miniature, and is
the other survivor.

**`useFocusTrap.ts:58-63` — a test that runs and cannot fail.** Reported not as
survived but as **no coverage**: no test reaches those lines at all, so the block
can be emptied and both calls in it deleted. There is a test named for it,
`Dialog.test.tsx`'s "holds focus on itself when there is nothing in it to
focus" — and `Dialog` always renders a close button, so "nothing to focus" is
unreachable through its public API. Its own comment gives it away: "Only the close
button, so every Tab lands back on it". Both its assertions are satisfied by the
ordinary wrap path. The guard it is named for has never run.

The rest of the survivors are honest test gaps rather than defects, and
`navigation.ts` at 56.90% is where to start.

### The one this cannot see

`DateRangeField.test.tsx` declares two presets, and both end on the same date. The
component compares ranges with `a.from === b.from && a.to === b.to`; delete the
second half and every test still passes, because no two presets in the fixture
differ only in their end date. **No mutant can surface this**, because the defect
is in the fixture rather than the source, and mutation testing mutates source.

It is not reachable from the real app either: the three presets in
`reportRanges.ts` all end today, and `aria-pressed` appears in zero assertions
across `apps/web`. So a comparison exists that nothing in this repository can
distinguish from its own deletion — which is the shape of blind spot worth
knowing about before reading 84% as 84% of anything.

## How it is laid out

```
server/              The API. Hono routes over an in-memory store.
src/
├── design-system/   Tokens and primitives. Knows nothing about tickets.
├── features/        The application. Auth, tickets, customers, reports, roles.
├── lib/             cn(), the API client and its contract, seed data, domain types.
└── app/             Layout, routes, providers.
```

The dependency direction only ever runs one way: `features/` uses `design-system/`,
never the reverse. A ticket status is a domain value; a badge appearance is a
presentation value; the mapping between them lives in the feature layer.

## Data

`server/` is a Hono API over an in-memory store, seeded with the same 40 tickets from
`apps/api/src/seed.ts`, generated deterministically so the list is identical on every
restart. Changes persist while the server is up and are lost when it restarts.

Every request body and query string is validated at the boundary with zod, and every
failure comes back in one shape: `{ error: { code, message, details? } }`. The schemas
live in `packages/shared/src/contract.ts` and are imported by both ends, so the server validates
requests and the client parses responses against the same definitions.

The sixty seeded customers are generated the same way, from the same PRNG. They are
linked to the queue by name — a ticket belongs to the customer who shares a name with
its assignee, or, when nobody is assigned, with whoever opened the conversation on it —
because the queue records no reporter, and inventing one would have meant changing what
a ticket is for the sake of a screen that reads them. Ten of the sixty have raised
something; the other fifty never have, which is also true of most customers of most
products. A customer holds ticket *ids*, resolved through the ticket store on every
request, so deleting a ticket removes it from the customer who raised it immediately.

The four plans are the one thing here that is written out rather than generated, in
`apps/api/src/planSeed.ts`. A price list is four facts somebody decided, not sixty rows
that only have to look plausible — and the numbers are what the catalogue's own rules are
demonstrated against, so a random price would make the screen's refusals depend on the
seed.

Requests are delayed by 150–400ms so that loading states are real states the UI has to
handle. The knobs for working on those states:

| How | Effect |
| --- | --- |
| `?fail=1` on any request | That request fails with a 500 |
| `API_FAIL=1 npm run dev` | Every request fails |
| `API_LATENCY_MS=0 npm run dev` | No artificial latency |

Every request is authenticated. The API refuses anything without a session cookie, so
`curl`ing an endpoint needs one — sign in first and keep the cookie:

```bash
curl -c jar -X POST localhost:8787/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"dana.whitfield@supportdesk.example","password":"support-desk-dev"}'
curl -b jar localhost:8787/api/tickets
```

## Two screens, two patterns

Tickets and customers are built deliberately unalike, and both patterns are meant to
stay. Tickets are a paginated table with single-value filters and a route per ticket.
Customers are a dense list of avatars with a cursor and a load-more, a set filter over
plans, and a drawer that slides over the list rather than a route change — because
opening a customer is a glance taken while working through the list, and a glance
should not be a history entry.

Both lists have bulk actions, and they differ in what "everything" means. A ticket
selection is bounded by the page it was made on, so select-all is a header cell. A
customer selection spans every page loaded so far and keeps spanning them as more
arrive, so select-all lives on the actions bar and says how many it will tick.

`packages/ui/README.md` covers why `Table` and
`List`, `Modal` and `Drawer`, `Select` and `MultiSelect` are pairs of primitives rather
than one primitive with a prop.

## Server state

TanStack Query owns everything that comes from the API. Hooks live in
`src/features/tickets/hooks/`, one per query or mutation, over the typed fetch wrapper
in `src/lib/api/http.ts`. Cache keys are only ever built through the factory in
`src/features/tickets/ticketKeys.ts`.

Saved views are not server state. They are a shortcut a person keeps for themselves, so
they stay in localStorage — see `src/features/savedViews/`.

There is one saved-view mechanism and both lists use it. A saved view is a named set of
filters that belongs to a screen, and a screen asks for the views that are its own by
handing the mechanism a *scope*: where its views are kept, what it calls the absence of
one, what "no filters" means, the canonical form of a combination, and how to get one
back out of storage anything may have written to. `src/features/tickets/savedViews.ts`
and `src/features/customers/savedViews.ts` are those two scopes, and they are the whole
of what is per-screen — the storage, the sidebar, the naming dialog, which view is
selected and whether the filters have drifted from it are shared. The filters themselves
stay different shapes on purpose: a widened single value on the queue, a set on the
customer list. Adding saved views to a third screen is writing a third scope.

Tests intercept HTTP with MSW and hand the request to the real API, so a test exercises
the real query layer against the real routing and validation rather than agreeing with a
second implementation of the queue. See `src/test/msw/handlers.ts`.

## Signing in

Sessions are an httpOnly, `SameSite=Lax` cookie. The client never reads it and holds no
token: what it knows about being signed in is whether `GET /api/me` answers, which is
what the route guard reads and what the header writes a name from. A 401 from any
endpoint is handled once, in the fetch wrapper, by sending the user to `/login` with
where they were headed in the query string — a session can lapse while the app is open,
and an error band on a screen they can no longer load is not the way out.

Passwords are hashed with scrypt from `node:crypto`: a real memory-hard KDF, in the
standard library, so a reference codebase people clone and run gains no native build
step. Failed sign-ins are rate-limited per account — five in fifteen minutes — which
stops guessing at one account and not one password sprayed across many. Both the session
expiry and that window are measured against a clock the app is handed, so the tests move
time without faking timers.

Six accounts are seeded, one per name the queue assigns tickets to, all with the password
`support-desk-dev`:

| Email | Role |
| --- | --- |
| `dana.whitfield@supportdesk.example` | admin |
| `marco.ellis@supportdesk.example` and the other four | agent |

Registering is open and always creates an agent. Sessions live in memory, so restarting
the API signs everyone out — which is also the easiest way to see the 401 path work.

## Searching everything at once

`Cmd`/`Ctrl` + `K` from anywhere, or the control in the header, opens a palette over the
page. It searches tickets by id, title and assignee, customers by name, company and
email, and the screens themselves, and takes you to whatever you pick. The groups come
back in that order because the queue is where the day is spent; the order is fixed
rather than scored, so the row under the cursor does not move as you type.

The server does the searching, on one endpoint — `GET /api/search`. Two list endpoints
plus a locally filtered nav would be three places for "an agent cannot see this" to be
true and one of them in the browser, and the queue's own list endpoint deliberately does
not search an assignee, because that filter is the one above the ticket table. The
request waits for a pause in typing, the way both list screens do.

Nothing typed shows the screens this role can reach, which needs no request. The screens
themselves come from `NAVIGATION_TARGETS` in the shared contract — one table, read by
the header nav, the route guard and the search — so a screen a role cannot reach is
absent from all three at once, and the records that live on it drop out of that role's
search with it.

## Roles

Two roles, `agent` and `admin`, and the role now comes from the session. Ticket deletion
and the bulk actions on both lists are admin-only, enforced on the server: an agent
calling one is refused with a 403 rather than merely not shown the button. The UI hides
them too, which is a courtesy rather than the enforcement.

**Two screens are admin-only as well**, and those are the gates that are not about
writing. Reports is the only screen whose subject is the agents rather than the queue —
the assignee table ranks named people by how much each of them resolved. Plans is the
only screen whose subject is neither: a price list is what the business charges, and an
agent working tickets has no reason to read it and no business changing it. Every other
screen is somebody's daily work. An agent is not offered either in the nav, is redirected
away from both addresses, and is refused by all five endpoints behind them.

The role context carries `canManageTickets` and `canManageCustomers` separately, both
true for an admin today: they are different powers, and a customer screen asking about
tickets is a line that reads wrong.

## A plan is a rung, not a row

The four plans are a closed union in the shared contract — `CUSTOMER_PLANS` — and the
catalogue screen does not add to it or take from it. What an administrator edits is a
plan's *terms*: what it costs a month, how many seats it carries, and the line saying who
it is for. The plan's own name is not among them, and that is the split the whole feature
turns on. `pro` is the identity a customer row stores, a saved view is written in and an
exported CSV says, so renaming it would rewrite yesterday's export and silently re-point a
stored filter; what it costs is a commercial fact about that identity and changes without
the plan becoming a different plan.

**The rule is that the plans read as a ladder.** Going up `CUSTOMER_PLANS`, a price never
falls and a seat limit never falls — unlimited being the top of that order rather than an
absent value. Neither is a fact about the plan being edited. Whether Pro is priced
correctly is a question about Starter and Enterprise, so the check cannot live on the
field, cannot live in the schema, and cannot honestly live in a browser holding a copy of
three plans it did not just fetch. `customerPlanLadderIssue` in
`packages/shared/src/plans.ts` takes the whole catalogue an edit *would* produce, and the
server is what asks it: a refused edit comes back as a 409 whose message is the rule's own
sentence, naming the two rungs that are out of order rather than saying the edit was
rejected. The dialog renders what it is handed, the same way the ticket screens render a
guard's `requirement`.

The other half is the count on each row, which is the join between this screen and the
customer list and the whole of it — nothing here fetches a customer, and moving somebody
onto a plan is still done from the list, because that is a fact about a customer rather
than about a plan.

## A status is a position, not a value

A ticket's status used to be one of four values, and any of them could be written over
any other. So a ticket nobody had worked could be closed, a closed one could be opened
again with a click and no explanation, and a ticket could be resolved while it was still
unassigned. Nothing stopped any of it, because a status was a field and the four values
had no order between them.

They have one now, and the steps between them are named. The four statuses, their
labels and their badges are unchanged — what changed is that a status is somewhere a
ticket gets *taken*:

| Move | From | To | Who | What has to be true |
| --- | --- | --- | --- | --- |
| Start work | Open | Pending | both | the ticket has an owner |
| Resolve | Pending | Resolved | both | the ticket has an owner |
| Close | Resolved | Closed | both | — |
| Not fixed | Resolved | Pending | both | a reason is given |
| Return to queue | Pending | Open | both | a reason is given |
| Reopen | Closed | Open | **admin** | a reason is given |

Two rules do most of the work here, and neither is written out six times.
**A ticket cannot be resolved before somebody owns it** because there is no move from
Open to Resolved at all: the only way in is out of Pending, and the only way into
Pending will not run on an unowned ticket. **Every move that takes a ticket backwards
asks why**, which is one rule read off the statuses' order rather than six decisions —
and `workflow.test.ts` asserts it over the table, so a seventh move cannot be added
that quietly skips it.

`packages/shared/src/workflow.ts` is all of it: the guards and the transitions as
tables, and pure functions over them, read by both ends. Adding a fifth status is an
entry in `TICKET_STATUSES`, a label beside it in `TICKET_STATUS_LABELS`, a badge
appearance in `TicketStatusBadge`, and the moves that reach it. Those two records are
keyed by `TicketStatus`, so a status added without them does not compile — and that is
the design rather than a gap in it: the alternative is a lookup with a fallback, which
draws an unknown status grey and unnamed on every screen at once and never tells
anybody.

Nothing else changes, and no screen *decides* anything. The filters, the saved views,
the reports and the CSV export read `TICKET_STATUSES` for its members and never learn
that a workflow exists.

**The server is the authority and the interface asks.** `GET /api/tickets/:id/moves`
answers with every move this role may make from where the ticket is, and whether each
can be made right now; the ticket screen draws that answer. It could read the shared
table itself, and deliberately does not: a condition turns on ticket state the browser
may be a moment behind on, and the role rule must not have a second implementation in
JavaScript. What it does read from the table is a move's label and whether committing it
asks for a reason — presentation, which was never the server's to send.

A move a role may not make is absent rather than greyed out: a disabled control
explaining a power you do not have is a screen telling you about somebody else's job. A
move that is *yours* but blocked by the ticket is drawn disabled with the condition as
its description, so an unassigned ticket says what it is waiting for instead of showing
an empty card. Either way the server refuses it too — a 403 for a role, a 409 for a
position or a condition — and the message is the condition that failed, never that the
request was refused.

**A bulk move does not pretend a selection is one ticket.**
`POST /api/tickets/bulk/moves` applies the move to every ticket that can take it and
answers with the ids it moved and the rest with the condition that stopped each. So the
bar leaves the refused rows ticked — they are the ones that still need something — and
says how many moved and why the others did not. Ten pending tickets with three of them
unassigned is "7 tickets moved. 3 were left where they were," and one sentence
explaining it.

**A ticket keeps its moves**, in `history`, and that is what makes asking for a reason
worth anything: the sentence is kept for whoever opens the ticket next and wants to know
why a closed one is back in their queue. Seeded tickets have none — the seed puts them
straight into the status they are in, and a history invented for them would be a record
of moves nobody made.
