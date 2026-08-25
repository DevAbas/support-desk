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
├── features/        The application. Tickets, roles, settings.
├── lib/             cn(), the API client and its contract, seed data, domain types.
└── app/             Layout, routes, providers.
```

The dependency direction only ever runs one way: `features/` uses `design-system/`,
never the reverse. A ticket status is a domain value; a badge appearance is a
presentation value; the mapping between them lives in the feature layer — see
`features/taxonomy/appearance.ts`.

## Data

`server/` is a Hono API over an in-memory store, seeded with the same 40 tickets from
`src/lib/seed.ts`, generated deterministically so the list is identical on every
restart. Changes persist while the server is up and are lost when it restarts.

Every request body and query string is validated at the boundary with zod, and every
failure comes back in one shape: `{ error: { code, message, details? } }`. The schemas
live in `src/lib/api/contract.ts` and are imported by both ends, so the server validates
requests and the client parses responses against the same definitions.

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

## Roles

Two roles, `agent` and `admin`. `GET /api/me` reports which one the server was started
with, and the Settings page overrides it locally — there is no login to enforce anything
against. Bulk actions, ticket deletion and editing the taxonomy are admin-only.

## Statuses and priorities

What a ticket can be set to is configuration rather than a union compiled into the
bundle. An admin edits both sets on the Settings page: the label a value reads as, the
badge appearance it takes, the order they are offered in, and which values exist at all.
`GET /api/settings/taxonomy` serves them alongside how many tickets hold each, and a
`PUT` replaces both sets whole — order is part of what is being edited, and a removal
only means anything against a complete list.

`TicketStatus` and `TicketPriority` are therefore `string`, and validating one is split
in two. The contract in `packages/shared/src/contract.ts` checks the *shape* of a value,
because it is static and imported by both ends; the routes that write one check its
*membership* against the live taxonomy and report a failure the same way the schema
would have. A filter is deliberately only shape-checked: a saved view can outlive the
status it was built on, and an empty list is a kinder answer than a 400.

Removing a value that tickets still hold is refused unless the request says where those
tickets should go. The Settings page asks for that destination in a dialog before it
will remove the row, and the server applies the move — nothing is written unless the
whole edit is valid, so a rejected save leaves every ticket where it was.

The first status is the one a new ticket opens in, which is why reordering the set is
part of the editor rather than a cosmetic detail.
