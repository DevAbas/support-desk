import type { ListTicketsQuery } from '@harness-sample/shared'

/**
 * Every cache key the ticket screens use.
 *
 * Keys are never written as inline arrays at a call site: a typo in one would
 * not fail to compile, it would quietly split the cache or fail to invalidate.
 * Going through the factory also makes the hierarchy usable — invalidating
 * `lists()` reaches every filter combination without naming any of them.
 *
 * `list()` takes a whole `ListTicketsQuery`, so a filter added to the contract
 * cannot be left out of the key that depends on it.
 */

const all = ['tickets'] as const

const lists = [...all, 'list'] as const

const details = [...all, 'detail'] as const

export const ticketKeys = {
  all: () => all,
  lists: () => lists,
  list: (query: ListTicketsQuery) => [...lists, query] as const,
  details: () => details,
  detail: (id: string) => [...details, id] as const,
}
