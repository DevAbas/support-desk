/**
 * The cache keys for the editable taxonomy.
 *
 * A factory for the same reason `ticketKeys` is one: the key that reads the
 * taxonomy and the key the editor invalidates after saving have to be the same
 * array, and a typo in an inline one would not fail to compile.
 */
const all = ['taxonomy'] as const

export const taxonomyKeys = {
  all: () => all,
  current: () => [...all, 'current'] as const,
}
