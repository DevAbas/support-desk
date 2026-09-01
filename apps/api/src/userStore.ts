import type { RegisterBody, User } from '@support-desk/shared'
import { hashPassword, verifyPassword } from './password'
import { createSeedUsers, formatUserId, type UserRecord } from './userSeed'

/**
 * The in-memory user store.
 *
 * It has no `update` and no `remove`: this app has no screen that edits an
 * account or deletes one, and a store method with no caller is a shape nobody
 * has had to defend. Registration and lookup are the whole of it.
 *
 * **The hash does not leave.** `get`, `findByEmail` and `create` answer with a
 * `User`, which has no password field, so a route cannot forget to strip one.
 * `verify` is the only method that reads the hash, and it reads it into a
 * decision.
 *
 * Everything that leaves the store is built fresh, so a caller holds a response
 * rather than a handle on a row.
 */

export interface UserStore {
  get: (id: string) => User | undefined
  /** Case-insensitive: an address is the same address in any casing. */
  findByEmail: (email: string) => User | undefined
  /** Undefined when the email is already taken. */
  create: (input: RegisterBody) => User | undefined
  /**
   * The user, when that is their password. Undefined for both of the other
   * outcomes — no such account, and wrong password — because the caller must not
   * be able to tell those apart, and the easiest way to guarantee that is to
   * give it nothing to tell them apart with.
   */
  verify: (email: string, password: string) => User | undefined
  /** Restores the seed state. Tests call this between cases. */
  reset: () => void
}

/**
 * Named field by field rather than spread with the hash destructured off.
 *
 * Both work today; only this one keeps working when `UserRecord` grows a field.
 * A rest spread leaks anything nobody remembered to exclude, and the field most
 * likely to be added to a user record is the next one that must not be sent.
 */
function toUser(record: UserRecord): User {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    role: record.role,
    avatarUrl: record.avatarUrl,
  }
}

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function createUserStore(): UserStore {
  let users: UserRecord[] = createSeedUsers()
  let nextSequence = users.length + 1

  function findRecord(email: string): UserRecord | undefined {
    const wanted = normaliseEmail(email)

    return users.find((user) => normaliseEmail(user.email) === wanted)
  }

  return {
    get(id) {
      const record = users.find((user) => user.id === id)

      return record ? toUser(record) : undefined
    },

    findByEmail(email) {
      const record = findRecord(email)

      return record ? toUser(record) : undefined
    },

    create(input) {
      if (findRecord(input.email)) {
        return undefined
      }

      // Everyone who signs themselves up is an agent. There is no screen that
      // promotes one, and a registration form that could mint an admin would be
      // the whole authorisation model with a text field in front of it.
      const record: UserRecord = {
        id: formatUserId(nextSequence),
        name: input.name,
        email: normaliseEmail(input.email),
        role: 'agent',
        avatarUrl: null,
        passwordHash: hashPassword(input.password),
      }

      nextSequence += 1
      users = [...users, record]

      return toUser(record)
    },

    verify(email, password) {
      const record = findRecord(email)

      if (!record) {
        return undefined
      }

      return verifyPassword(password, record.passwordHash) ? toUser(record) : undefined
    },

    reset() {
      users = createSeedUsers()
      nextSequence = users.length + 1
    },
  }
}
