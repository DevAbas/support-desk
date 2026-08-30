import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

/**
 * Password hashing, as two pure functions over strings.
 *
 * **Why scrypt.** It is a real memory-hard key derivation function (RFC 7914)
 * and it is already in the Node standard library. bcrypt and argon2 are the
 * other honest answers, and either would be fine, but both arrive as a native
 * module with a build step — and this repo is meant to be cloned and run, with
 * three runtime dependencies in total. A placeholder like a bare SHA-256 is not
 * on the list at all: a fast hash is the whole of what makes a leaked table
 * worth stealing.
 *
 * **Why the parameters travel with the hash.** A stored password outlives the
 * settings it was made with. Writing them into the string means the cost can be
 * raised later without a migration: an old hash still verifies against the
 * numbers it was written with, and is rewritten at the next successful sign-in
 * if anyone ever wants to do that.
 *
 * The synchronous form is deliberate. Hashing is the expensive part of signing
 * in on purpose, and the two callers — a login route and the seed — both want
 * the answer before they do anything else.
 */

/** CPU/memory cost. Node's default, and about 60ms on a developer's machine. */
const COST = 16384

const BLOCK_SIZE = 8

const PARALLELISATION = 1

const SALT_BYTES = 16

const KEY_BYTES = 64

/**
 * scrypt needs headroom above `128 * COST * BLOCK_SIZE` or it refuses to run.
 * Node's default ceiling is 32MB, which the cost above sits exactly on.
 */
const MAX_MEMORY_BYTES = 64 * 1024 * 1024

const PREFIX = 'scrypt'

function derive(password: string, salt: Buffer, cost: number, blockSize: number, parallel: number) {
  return scryptSync(password.normalize('NFKC'), salt, KEY_BYTES, {
    N: cost,
    r: blockSize,
    p: parallel,
    maxmem: MAX_MEMORY_BYTES,
  })
}

/** `scrypt$16384$8$1$<salt>$<hash>`, both halves base64. */
export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_BYTES)
  const key = derive(password, salt, COST, BLOCK_SIZE, PARALLELISATION)

  return [
    PREFIX,
    String(COST),
    String(BLOCK_SIZE),
    String(PARALLELISATION),
    salt.toString('base64'),
    key.toString('base64'),
  ].join('$')
}

/**
 * False for a wrong password and false for a stored string this cannot read,
 * rather than throwing on the second: a corrupted row should refuse the sign-in
 * it belongs to, not take down the route for everyone.
 */
export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$')

  if (parts.length !== 6 || parts[0] !== PREFIX) {
    return false
  }

  const [, cost, blockSize, parallel, salt, expected] = parts as [
    string,
    string,
    string,
    string,
    string,
    string,
  ]

  const expectedKey = Buffer.from(expected, 'base64')

  if (expectedKey.length !== KEY_BYTES) {
    return false
  }

  const actualKey = derive(
    password,
    Buffer.from(salt, 'base64'),
    Number(cost),
    Number(blockSize),
    Number(parallel),
  )

  // Length is checked above, so this compares two buffers of the same size —
  // which is what `timingSafeEqual` requires, and why it is not simply `===`.
  return timingSafeEqual(actualKey, expectedKey)
}
