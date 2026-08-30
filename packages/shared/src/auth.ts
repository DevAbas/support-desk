import { z } from 'zod'
import { roleSchema } from './contract'
import type { User } from './types'

/**
 * The authentication contract, shared by both ends of it.
 *
 * A user is domain vocabulary the way a customer is — they carry a `Role`, which
 * already lives in `types.ts` — so the shape itself is there and only the wire is
 * here. The wire lives in its own file rather than in `contract.ts` for the same
 * reason `customers.ts` does: that file is already the ticket contract.
 *
 * Two things here are deliberately unlike the rest of the contract:
 *
 * **Nothing on the wire carries a password back.** `userSchema` is what the
 * server answers with, and it has no password field to forget to strip. The
 * password travels one way, in a request body, and the stored hash never leaves
 * `apps/api`.
 *
 * **The session itself is not in this contract.** It is an httpOnly cookie, so
 * the client cannot read it and has no shape to parse. What the client knows
 * about being signed in is `GET /api/me` answering rather than refusing, which
 * is why `meResponseSchema` is the session's whole client-side shape.
 */

export const userSchema: z.ZodType<User> = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  role: roleSchema,
  avatarUrl: z.string().nullable(),
})

/** The shortest password this app will store. */
export const MIN_PASSWORD_LENGTH = 8

/**
 * Long enough that nobody meets it by accident, short enough that hashing stays
 * cheap: scrypt over a megabyte of passphrase is a denial of service with a
 * polite name.
 */
export const MAX_PASSWORD_LENGTH = 200

export const registerBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().max(200),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH),
})

export type RegisterBody = z.infer<typeof registerBodySchema>

/**
 * Deliberately not `registerBodySchema.pick(...)`: the password here is bounded
 * only by what is worth hashing, not by the policy.
 *
 * A sign-in form that rejects a seven-character password before sending it has
 * told an attacker that the account it belongs to is not the one they are
 * looking for. Every wrong password should fail the same way, at the same point,
 * with the same message.
 */
export const loginBodySchema = z.object({
  email: z.email().max(200),
  password: z.string().min(1).max(MAX_PASSWORD_LENGTH),
})

export type LoginBody = z.infer<typeof loginBodySchema>

/**
 * Who the API says is signed in.
 *
 * A user rather than a role: the header writes a name, and a screen that gates
 * on a permission asks `useRole`, which reads the role off this.
 */
export const meResponseSchema = z.object({ user: userSchema })

export type MeResponse = z.infer<typeof meResponseSchema>
