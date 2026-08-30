/**
 * Where to go back to after signing in, carried in the URL.
 *
 * A query parameter rather than router state, because the two things that set it
 * are not alike: the route guard has a `location` in hand and could use either,
 * but the 401 interceptor fires from the fetch wrapper on a session that has
 * just expired, and a reload — which is what a stale tab often gets — takes
 * router state with it. One mechanism that survives both is worth more than the
 * tidier one that only works from inside React.
 */

export const NEXT_PARAM = 'next'

export const DEFAULT_LANDING = '/tickets'

/**
 * Only a path on this site.
 *
 * `next` arrives from a URL, and a URL is typed by whoever sends the link. A
 * value like `//evil.example/` is a protocol-relative URL that a browser will
 * happily leave the site for, so anything that is not a single leading slash is
 * refused and the caller lands on the default instead.
 */
export function safeNextPath(value: string | null): string {
  if (value === null || !value.startsWith('/') || value.startsWith('//')) {
    return DEFAULT_LANDING
  }

  return value
}

/** The login URL that will send someone back to `from` once they are in. */
export function toLoginPath(from: string): string {
  if (from === '' || from === DEFAULT_LANDING) {
    return '/login'
  }

  return `/login?${NEXT_PARAM}=${encodeURIComponent(from)}`
}
