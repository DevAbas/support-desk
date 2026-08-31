import type { SearchQuery } from '@harness-sample/shared'

/**
 * Every cache key the search uses.
 *
 * The same rule as `ticketKeys`, `customerKeys` and `reportKeys`: a key is never
 * an inline array at a call site, so a typo cannot quietly split the cache.
 *
 * The whole query goes in, term and limit together, because both change the
 * answer. What does *not* go in is the role: it is the session's, the server
 * reads it off the cookie, and a signed-in user is one role for the life of the
 * cache — signing in as somebody else empties it.
 */

const all = ['search'] as const

export const searchKeys = {
  all: () => all,
  query: (query: SearchQuery) => [...all, query] as const,
}
