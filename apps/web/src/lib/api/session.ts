import { z } from 'zod'
import {
  loginBodySchema,
  meResponseSchema,
  registerBodySchema,
  type LoginBody,
  type MeResponse,
  type RegisterBody,
} from '@support-desk/shared'
import { apiRequest } from './http'

/**
 * The session, as the four requests that make one and read one.
 *
 * There is no token here, and there is nothing for this module to store. The
 * session is an httpOnly cookie the browser attaches and this code cannot see,
 * so "am I signed in?" is not a variable to consult — it is `getMe` answering
 * rather than refusing, which is why every screen asks through the same query.
 *
 * `signOut` returns nothing and parses nothing: the server answers 204, and the
 * only thing that matters afterwards is that the cache is emptied, which is the
 * caller's job.
 */

/**
 * `allowUnauthorized` because a 401 here is the answer, not a failure. Without
 * it the wrapper would read the signed-out state as a session that had just
 * expired and redirect — including on the login page, which asks this to find
 * out whether it is needed at all.
 */
export function getMe(signal?: AbortSignal): Promise<MeResponse> {
  return apiRequest('/me', { schema: meResponseSchema, signal, allowUnauthorized: true })
}

/** A 401 from here is a wrong password, so it must not be read as an expiry. */
export function signIn(body: LoginBody): Promise<MeResponse> {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: loginBodySchema.parse(body),
    schema: meResponseSchema,
    allowUnauthorized: true,
  })
}

export function signUp(body: RegisterBody): Promise<MeResponse> {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: registerBodySchema.parse(body),
    schema: meResponseSchema,
  })
}

/** 204 leaves no body, and `readBody` reports a missing one as `undefined`. */
const emptyResponseSchema = z.undefined()

export function signOut(): Promise<void> {
  return apiRequest('/auth/logout', { method: 'POST', schema: emptyResponseSchema })
}
