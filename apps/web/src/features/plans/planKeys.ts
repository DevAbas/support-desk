/**
 * Every cache key the plan catalogue uses.
 *
 * The same rule as `ticketKeys`, `customerKeys` and `reportKeys`: keys are never
 * written as inline arrays at a call site, so a typo cannot quietly split the
 * cache or fail to invalidate.
 *
 * `list` takes nothing, and that is the shape of the endpoint rather than an
 * omission. There is one question to ask about the plans — all of them — so
 * there is one answer to cache, and a key parameterised by a filter nothing
 * sends would be a hierarchy with one branch.
 */

const all = ['plans'] as const

export const planKeys = {
  all: () => all,
  list: () => [...all, 'list'] as const,
}
