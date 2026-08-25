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
| `npm run lint` | ESLint |
| `npm run test` | Run the test suite once |
| `npm run test:watch` | Run the test suite in watch mode |

## How it is laid out

```
server/              The API. Hono routes over an in-memory store.
src/
├── design-system/   Tokens and primitives. Knows nothing about tickets.
├── features/        The application. Tickets, customers, reports, roles, settings.
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
| `API_ROLE=admin npm run dev` | `GET /api/me` reports an admin |

The API is deliberately not role-aware — it will delete a ticket for anyone who asks.
Authorisation is enforced in the UI only.

## Two screens, two patterns

Tickets and customers are built deliberately unalike, and both patterns are meant to
stay. Tickets are a paginated table with single-value filters and a route per ticket.
Customers are a dense list of avatars with a cursor and a load-more, a set filter over
plans, and a drawer that slides over the list rather than a route change — because
opening a customer is a glance taken while working through the list, and a glance
should not be a history entry. The filter combinations worth keeping are chips in a
strip above the list rather than a sidebar beside it, for the same reason the filters
themselves are one line: a list that is scanned down wants its width. `src/design-system/README.md` covers why `Table` and
`List`, `Modal` and `Drawer`, `Select` and `MultiSelect` are pairs of primitives rather
than one primitive with a prop.

## Server state

TanStack Query owns everything that comes from the API. Hooks live in
`src/features/tickets/hooks/`, one per query or mutation, over the typed fetch wrapper
in `src/lib/api/http.ts`. Cache keys are only ever built through the factory in
`src/features/tickets/ticketKeys.ts`.

Saved views are not server state. They are a shortcut a person keeps for themselves, so
they stay in localStorage — see `src/features/tickets/savedViews.ts`. Saved segments are
the same shortcut over the customer list, in a module and under a storage key of their
own, because a segment holds a set of plans where a view holds single values widened
with `all` — see `src/features/customers/customerSegments.ts`.

Tests intercept HTTP with MSW and hand the request to the real API, so a test exercises
the real query layer against the real routing and validation rather than agreeing with a
second implementation of the queue. See `src/test/msw/handlers.ts`.

## Roles

Two roles, `agent` and `admin`. `GET /api/me` reports which one the server was started
with, and the Settings page overrides it locally — there is no login to enforce anything
against. Bulk actions and ticket deletion are admin-only.
