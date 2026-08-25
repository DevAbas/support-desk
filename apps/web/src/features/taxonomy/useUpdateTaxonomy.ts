import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import type { UpdateTaxonomyBody, UpdateTaxonomyResponse } from '@harness-sample/shared'
import { updateTaxonomy } from '@/lib/api/taxonomy'
import { ticketKeys } from '@/features/tickets/ticketKeys'
import { taxonomyKeys } from './taxonomyKeys'

/**
 * Saving the taxonomy invalidates the tickets as well as the taxonomy itself.
 *
 * Renaming a label only changes what is on screen, but removing a value moves
 * every ticket that held it onto another one — the server reports how many in
 * `migrated`. The cached lists and details would still be describing the old
 * value, so they are dropped rather than trusted.
 */
export function useUpdateTaxonomy(): UseMutationResult<
  UpdateTaxonomyResponse,
  Error,
  UpdateTaxonomyBody
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateTaxonomy,
    onSuccess: (result) => {
      queryClient.setQueryData(taxonomyKeys.current(), {
        taxonomy: result.taxonomy,
        usage: result.usage,
      })

      return queryClient.invalidateQueries({ queryKey: ticketKeys.all() })
    },
  })
}
