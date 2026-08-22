# Support Desk

A small support-tickets admin panel built on its own design system. It exists as a
reference codebase for a video series on harness engineering for frontend projects.

The point of the repo is what it *does not* have. There is no `AGENTS.md`, no
`CLAUDE.md`, no lint rule that enforces the design system, and no other machine-readable
guidance. The rules for working in this codebase are written in prose in
[`src/design-system/README.md`](src/design-system/README.md), and nothing forces anyone
— human or agent — to read them.

## Stack

React 19, TypeScript (strict), Vite, Tailwind CSS v4, React Router, Vitest with React
Testing Library, ESLint. No component library, no state management library, no backend.

## Running it

```bash
npm install
npm run dev
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Typecheck and build for production |
| `npm run typecheck` | Typecheck only |
| `npm run lint` | ESLint |
| `npm run test` | Run the test suite once |
| `npm run test:watch` | Run the test suite in watch mode |

## How it is laid out

```
src/
├── design-system/   Tokens and primitives. Knows nothing about tickets.
├── features/        The application. Tickets, roles, settings.
├── lib/             cn(), the mock API, seed data, shared domain types.
└── app/             Layout, routes, providers.
```

The dependency direction only ever runs one way: `features/` uses `design-system/`,
never the reverse. A ticket status is a domain value; a badge appearance is a
presentation value; the mapping between them lives in the feature layer.

## Data

There is no backend. `src/lib/api.ts` is an in-memory store seeded with 40 tickets from
`src/lib/seed.ts`, generated deterministically so the list is identical on every reload.
Every call is artificially delayed by 250–600ms so that loading states are real states
the UI has to handle. Changes persist while the tab is open and are lost on reload.

The mock API is deliberately not role-aware — it will delete a ticket for anyone who
asks. Authorisation is enforced in the UI only.

## Roles

Two roles, `agent` and `admin`, held in a React context. Bulk actions and ticket
deletion are admin-only. There is no login: switch role on the Settings page.
