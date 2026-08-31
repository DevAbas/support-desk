# Support Desk

A small support-tickets admin panel built on its own design system. It exists as a
reference codebase for a video series on harness engineering for frontend projects.

The point of the repo is what it *does not* have. There is no `AGENTS.md`, no
`CLAUDE.md`, no lint rule that enforces the design system, and no other machine-readable
guidance. The rules for working in this codebase are written in prose in
[`src/design-system/README.md`](src/design-system/README.md), and nothing forces anyone
— human or agent — to read them.

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
| `npm run test` | Run the test suite once |
| `npm run test:watch` | Run the test suite in watch mode |

`lint` and `lint:strict` run the same rules at two severities. `internal/eslint-plugin-harness`
holds the ones specific to this codebase, and its README says what each is for
and why — every one of them comes from a defect that was recorded here more than
once and caught by nothing.

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
`src/lib/seed.ts`, generated deterministically so the list is identical on every
restart. Changes persist while the server is up and are lost when it restarts.

Every request body and query string is validated at the boundary with zod, and every
failure comes back in one shape: `{ error: { code, message, details? } }`. The schemas
live in `src/lib/api/contract.ts` and are imported by both ends, so the server validates
requests and the client parses responses against the same definitions.

The sixty seeded customers are generated the same way, from the same PRNG. They are
linked to the queue by name — a ticket belongs to the customer who shares a name with
its assignee, or, when nobody is assigned, with whoever opened the conversation on it —
because the queue records no reporter, and inventing one would have meant changing what
a ticket is for the sake of a screen that reads them. Ten of the sixty have raised
something; the other fifty never have, which is also true of most customers of most
products. A customer holds ticket *ids*, resolved through the ticket store on every
request, so deleting a ticket removes it from the customer who raised it immediately.

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

`src/design-system/README.md` covers why `Table` and
`List`, `Modal` and `Drawer`, `Select` and `MultiSelect` are pairs of primitives rather
than one primitive with a prop.

## Server state

TanStack Query owns everything that comes from the API. Hooks live in
`src/features/tickets/hooks/`, one per query or mutation, over the typed fetch wrapper
in `src/lib/api/http.ts`. Cache keys are only ever built through the factory in
`src/features/tickets/ticketKeys.ts`.

Saved views are not server state. They are a shortcut a person keeps for themselves, so
they stay in localStorage — see `src/features/tickets/savedViews.ts`.

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

**Reports are admin-only as well**, and that is the one gate that is not about writing.
It is the only screen whose subject is the agents rather than the queue — the assignee
table ranks named people by how much each of them resolved — where every other screen is
somebody's daily work. An agent is not offered it in the nav, is redirected away from the
address, and is refused by all three endpoints behind it.

The role context carries `canManageTickets` and `canManageCustomers` separately, both
true for an admin today: they are different powers, and a customer screen asking about
tickets is a line that reads wrong.
