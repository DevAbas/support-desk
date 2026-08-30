import type { z } from 'zod'
import { apiErrorSchema, type ApiErrorCode } from '@harness-sample/shared'

/**
 * The one way this app talks to the API.
 *
 * Every response goes through a schema on the way in, so nothing untyped
 * reaches the UI, and every failure — a 4xx, an unreachable server, a body that
 * does not match the contract — arrives as the same `ApiError`. Screens can
 * render `error.message` without knowing which of those happened.
 *
 * Cancellation is not handled here. TanStack Query passes an `AbortSignal` into
 * the query function and this forwards it; an aborted request rejects with the
 * `AbortError` that Query expects to see.
 *
 * A 401 is handled here, and it is the one thing in this module with an effect
 * beyond its return value. A session can expire while the app is open, so any
 * request can be the one that discovers it — and a screen that renders an error
 * band saying "Sign in to continue" above a table it can no longer load is
 * showing the user a problem instead of the way out of it. Sending them to
 * `/login` is the same answer every time, which makes it the wrapper's answer
 * rather than something forty callers each remember to give.
 */

/** Failures the server reports, plus the two only the client can see. */
export type ApiFailureCode = ApiErrorCode | 'network_error' | 'invalid_response'

/** Told that the session is gone. Registered once, by `UnauthorizedRedirect`. */
export type UnauthorizedHandler = () => void

let unauthorizedHandler: UnauthorizedHandler | null = null

/**
 * A module-level subscriber rather than an argument threaded through every
 * caller: what to do about a lost session is one decision for the whole app, and
 * the wrapper is the only place that sees every response.
 *
 * Pass `null` to unregister, which is what the effect that set it does on the
 * way out.
 */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler
}

interface ApiErrorOptions {
  status: number
  code: ApiFailureCode
  message: string
  details?: readonly string[]
  cause?: unknown
}

export class ApiError extends Error {
  /** 0 when the request never reached the server. */
  readonly status: number
  readonly code: ApiFailureCode
  readonly details: readonly string[]

  constructor({ status, code, message, details = [], cause }: ApiErrorOptions) {
    super(message, { cause })
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

/** A request that failed in a way retrying will not fix. */
export function isClientError(error: unknown): boolean {
  return error instanceof ApiError && error.status >= 400 && error.status < 500
}

export function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message !== '' ? error.message : fallback
}

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

export type QueryParams = Readonly<Record<string, string | number>>

interface RequestOptions<TOutput> {
  /** Parsed with this before the caller sees it. */
  schema: z.ZodType<TOutput>
  method?: HttpMethod
  body?: unknown
  query?: QueryParams
  signal?: AbortSignal
  /**
   * Keeps a 401 from being treated as a lost session.
   *
   * Two requests need it. A rejected sign-in is a 401 about the password that
   * was just typed, and redirecting to the page the user is already on would
   * replace the message explaining it. `GET /api/me` is the question "am I
   * signed in?", whose negative answer is a 401 by design and is what the route
   * guard reads.
   */
  allowUnauthorized?: boolean
}

/** Relative, so the dev server's proxy and the deployed origin both work. */
const API_BASE_PATH = '/api'

function buildPath(path: string, query: QueryParams | undefined): string {
  if (!query) {
    return `${API_BASE_PATH}${path}`
  }

  const search = new URLSearchParams(
    Object.entries(query).map(([key, value]) => [key, String(value)]),
  )

  return `${API_BASE_PATH}${path}?${search.toString()}`
}

/** A body is expected on every response, but a broken server may not send one. */
async function readBody(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

function toFailure(status: number, payload: unknown): ApiError {
  const parsed = apiErrorSchema.safeParse(payload)

  if (parsed.success) {
    return new ApiError({ status, ...parsed.data.error })
  }

  return new ApiError({
    status,
    code: 'server_error',
    message: `The server returned an unexpected ${String(status)} response.`,
  })
}

export async function apiRequest<TOutput>(
  path: string,
  { schema, method = 'GET', body, query, signal, allowUnauthorized = false }: RequestOptions<TOutput>,
): Promise<TOutput> {
  let response: Response

  try {
    response = await fetch(buildPath(path, query), {
      method,
      signal,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (cause: unknown) {
    // An abort is Query cancelling a request it no longer wants; it is not a
    // failure to report, so it is left to propagate untouched.
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw cause
    }

    throw new ApiError({
      status: 0,
      code: 'network_error',
      message: 'Could not reach the server.',
      cause,
    })
  }

  const payload = await readBody(response)

  if (!response.ok) {
    if (response.status === 401 && !allowUnauthorized) {
      unauthorizedHandler?.()
    }

    throw toFailure(response.status, payload)
  }

  const parsed = schema.safeParse(payload)

  if (!parsed.success) {
    throw new ApiError({
      status: response.status,
      code: 'invalid_response',
      message: 'The server sent something this app does not understand.',
      details: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    })
  }

  return parsed.data
}
