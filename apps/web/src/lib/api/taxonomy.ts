import {
  taxonomyResponseSchema,
  updateTaxonomyBodySchema,
  updateTaxonomyResponseSchema,
  type TaxonomyResponse,
  type UpdateTaxonomyBody,
  type UpdateTaxonomyResponse,
} from '@harness-sample/shared'
import { apiRequest } from './http'

/**
 * The statuses and priorities an admin edits on the Settings page.
 *
 * The update is a PUT rather than a PATCH because the whole set is being
 * replaced: order is part of what is edited, and a removal only means anything
 * against a complete list.
 */
export function getTaxonomy(signal?: AbortSignal): Promise<TaxonomyResponse> {
  return apiRequest('/settings/taxonomy', { schema: taxonomyResponseSchema, signal })
}

export function updateTaxonomy(body: UpdateTaxonomyBody): Promise<UpdateTaxonomyResponse> {
  return apiRequest('/settings/taxonomy', {
    method: 'PUT',
    body: updateTaxonomyBodySchema.parse(body),
    schema: updateTaxonomyResponseSchema,
  })
}
