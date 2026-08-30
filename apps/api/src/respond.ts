import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { z } from 'zod'
import type { ApiErrorBody, ApiErrorCode, User } from '@harness-sample/shared'

/**
 * The one way this API answers a failure, and the one way it reads a body.
 *
 * These were private to `app.ts` until there was a second file of routes. They
 * are here rather than duplicated because the shape they produce is the contract
 * — `apiErrorSchema` parses every one of them — and two copies of a contract is
 * one copy and a future disagreement.
 */

/**
 * What the routes can read off the context.
 *
 * `user` is set by `requireSession` and is present on every route it guards,
 * which is every route except the three under `/api/auth`. Hono has no way to
 * say "present after this middleware", so the routes that run before it use
 * `c.get('user')` and check, and the ones after it use `currentUser`.
 */
export interface AppEnv {
  Variables: {
    user: User
  }
}

export type ApiContext = Context<AppEnv>

export function errorBody(code: ApiErrorCode, message: string, details?: string[]): ApiErrorBody {
  return { error: details ? { code, message, details } : { code, message } }
}

export function fail(
  c: ApiContext,
  status: ContentfulStatusCode,
  code: ApiErrorCode,
  message: string,
  details?: string[],
) {
  return c.json(errorBody(code, message, details), status)
}

/** One entry per failed field: `title: Too small: expected string to have >=5`. */
export function formatIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.join('.')
    return path === '' ? issue.message : `${path}: ${issue.message}`
  })
}

export function invalid(c: ApiContext, error: z.ZodError, subject: string) {
  return fail(c, 400, 'validation_failed', `The ${subject} is not valid.`, formatIssues(error))
}

export function missing(c: ApiContext, subject: string, id: string) {
  return fail(c, 404, 'not_found', `${subject} ${id} was not found.`)
}

/**
 * Reads a JSON body without letting a malformed one become a 500. An absent or
 * unparseable body is reported as the validation failure it is.
 */
export async function readJsonBody(
  c: ApiContext,
): Promise<{ ok: true; value: unknown } | { ok: false }> {
  try {
    return { ok: true, value: await c.req.json<unknown>() }
  } catch {
    return { ok: false }
  }
}

/** The shorthand every guarded route uses instead of repeating the cast. */
export function currentUser(c: ApiContext): User {
  return c.get('user')
}
