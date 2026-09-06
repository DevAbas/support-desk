import {
  customerPlanLadderIssue,
  customerPlanTermsInDomainOrder,
  withCustomerPlanTerms,
  type CustomerPlan,
  type CustomerPlanCatalogue,
  type CustomerPlanLadderIssue,
  type CustomerPlanTerms,
  type UpdateCustomerPlanBody,
} from '@support-desk/shared'
import { createSeedPlanCatalogue } from './planSeed'

/**
 * The in-memory plan catalogue.
 *
 * Four rows, keyed by a closed union, so this store has no create and no remove
 * — the set of plans is `CUSTOMER_PLANS` and changing it is a change to the
 * domain, not a request. `get` cannot miss and does not return `undefined`,
 * which is the difference between a table and a collection and is worth having
 * in the type: a route asking for a plan the schema has already accepted has
 * nothing to handle.
 *
 * **The rule is not here.** Whether an edit leaves a coherent ladder is
 * `customerPlanLadderIssue` in the shared contract, and this store's only job is
 * to ask it before committing — it builds the catalogue the edit *would*
 * produce, checks that, and keeps it only if it holds. Which is why there is
 * nothing here that undoes a write.
 *
 * `reset` restores the seed, and the same rule as the other stores applies:
 * tests call it between cases, or a plan re-priced by one test is still
 * re-priced in the next.
 *
 * Everything that leaves the store is built fresh, so a caller holds a response
 * rather than a handle on a row.
 */

/**
 * What an edit answers with: the plan as it now stands, or the rung that refused
 * it.
 *
 * A result rather than a thrown error or a null, because the refusal carries a
 * sentence somebody reads. "The edit did not happen" is not what a person needs
 * to be told; which two plans are out of order is.
 */
export type UpdatePlanResult =
  | { ok: true; terms: CustomerPlanTerms }
  | { ok: false; issue: CustomerPlanLadderIssue }

export interface PlanStore {
  /** Every plan's terms, in domain order. There is no page to ask for. */
  list: () => CustomerPlanTerms[]
  get: (plan: CustomerPlan) => CustomerPlanTerms
  update: (plan: CustomerPlan, terms: UpdateCustomerPlanBody) => UpdatePlanResult
  /** Restores the seed catalogue. Tests call this between cases. */
  reset: () => void
}

export function createPlanStore(): PlanStore {
  let catalogue: CustomerPlanCatalogue = createSeedPlanCatalogue()

  return {
    list() {
      return customerPlanTermsInDomainOrder(catalogue).map((terms) => ({ ...terms }))
    },

    get(plan) {
      return { ...catalogue[plan] }
    },

    update(plan, terms) {
      const proposed = withCustomerPlanTerms(catalogue, plan, terms)
      const issue = customerPlanLadderIssue(proposed)

      if (issue !== null) {
        return { ok: false, issue }
      }

      catalogue = proposed

      return { ok: true, terms: { ...proposed[plan] } }
    },

    reset() {
      catalogue = createSeedPlanCatalogue()
    },
  }
}
