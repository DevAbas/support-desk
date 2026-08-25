import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { TaxonomyEntry, TaxonomyResponse } from '@harness-sample/shared'
import { getTaxonomy } from '@/lib/api/taxonomy'
import { taxonomyKeys } from './taxonomyKeys'

/**
 * The statuses and priorities, with how many tickets hold each.
 *
 * Almost every ticket screen needs this — the badges, the filters, the status
 * dropdown on a ticket — so it is one query under one key rather than something
 * passed down from a page. It changes only when an admin saves the Settings
 * editor, so it is held far longer than the queue is.
 */
const TAXONOMY_STALE_TIME_MS = 5 * 60_000

export function useTaxonomy(): UseQueryResult<TaxonomyResponse, Error> {
  return useQuery({
    queryKey: taxonomyKeys.current(),
    queryFn: ({ signal }) => getTaxonomy(signal),
    staleTime: TAXONOMY_STALE_TIME_MS,
  })
}

export interface TaxonomySets {
  statuses: TaxonomyEntry[]
  priorities: TaxonomyEntry[]
}

/**
 * The two sets alone, empty until they arrive.
 *
 * The screens that only need to label a badge or fill a dropdown do not have a
 * loading state of their own to show, and an empty set is what they would render
 * anyway. Callers that have to tell "not loaded yet" from "genuinely empty" —
 * only the Settings editor does — use `useTaxonomy` directly.
 */
export function useTaxonomySets(): TaxonomySets {
  const { data } = useTaxonomy()

  return {
    statuses: data?.taxonomy.statuses ?? [],
    priorities: data?.taxonomy.priorities ?? [],
  }
}
