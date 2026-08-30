import type { Role, User } from '@harness-sample/shared'
import { hashPassword } from './password'

/**
 * The seeded users: the six people the queue already names, given passwords.
 *
 * The names are exactly the assignees in `seed.ts`, minus `Unassigned`, which is
 * a value rather than a person. That is the point of seeding them — a ticket
 * assigned to Priya Raman should be assigned to somebody who can sign in and
 * read it, and before this the assignee was a string that matched nobody.
 *
 * **Nothing here draws from the ticket PRNG.** `createSeedTickets` consumes
 * `createRandom` in a fixed order, the customer seed joins to the queue by name,
 * and three test files assert on figures derived from both. A random call added
 * anywhere in that sequence would move every one of them.
 */

/** A user as stored. The hash never leaves this package. */
export interface UserRecord extends User {
  passwordHash: string
}

/**
 * The password every seeded account signs in with.
 *
 * Exported so that the README, the dev walkthrough and the tests name one thing
 * rather than four copies of it that can drift apart. It is a fixture in a
 * reference app, not a secret: the store it unlocks is rebuilt from this file on
 * every restart.
 */
export const SEED_PASSWORD = 'support-desk-dev'

interface SeedPerson {
  name: string
  role: Role
}

/**
 * Dana Whitfield is the admin — first in the assignee pool, and the account the
 * walkthrough signs in as. Everyone else is an agent, which is what makes the
 * permission gates visible: sign in as anyone else and the bulk actions are
 * gone.
 */
const PEOPLE: readonly SeedPerson[] = [
  { name: 'Dana Whitfield', role: 'admin' },
  { name: 'Marco Ellis', role: 'agent' },
  { name: 'Priya Raman', role: 'agent' },
  { name: 'Tomas Lindqvist', role: 'agent' },
  { name: 'Aisha Bello', role: 'agent' },
  { name: 'Ren Nakamura', role: 'agent' },
]

/** `.example` is reserved for exactly this, so none of these can be written to. */
const EMAIL_DOMAIN = 'supportdesk.example'

export function toUserEmail(name: string): string {
  return `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@${EMAIL_DOMAIN}`
}

export function formatUserId(sequence: number): string {
  return `USR-${String(sequence).padStart(4, '0')}`
}

/**
 * Derived once, at module load, rather than inside `createSeedUsers`.
 *
 * scrypt costs about 60ms by design, `createUserStore` is called for every app,
 * and the api suite builds an app per test case. Hashing six passwords per test
 * would put twenty seconds on a suite that currently runs in one — so the work
 * happens once per process and the factory below hands out fresh records
 * pointing at the result.
 */
const SEEDED: readonly UserRecord[] = PEOPLE.map((person, index) => ({
  id: formatUserId(index + 1),
  name: person.name,
  email: toUserEmail(person.name),
  role: person.role,
  avatarUrl: null,
  passwordHash: hashPassword(SEED_PASSWORD),
}))

/** The admin, by name, for the walkthrough and the tests that need one. */
export const SEED_ADMIN_EMAIL = toUserEmail('Dana Whitfield')

/** An agent, for the tests that need a request to be refused. */
export const SEED_AGENT_EMAIL = toUserEmail('Marco Ellis')

export function createSeedUsers(): UserRecord[] {
  return SEEDED.map((record) => ({ ...record }))
}
