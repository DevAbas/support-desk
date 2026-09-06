import { z } from 'zod'
import { customerPlanSchema } from './customers'
import {
  CUSTOMER_PLANS,
  CUSTOMER_PLAN_LABELS,
  type CustomerPlan,
  type CustomerPlanTerms,
} from './types'

/**
 * The plan catalogue contract, shared by both ends of it.
 *
 * A plan is already domain vocabulary — `CUSTOMER_PLANS` names the four, and a
 * customer row carries one — so this file is not what a plan *is*. It is the
 * wire for the part of a plan that changes, and the rule that says which changes
 * leave a coherent catalogue behind. `CustomerPlanTerms` in `types.ts` is the
 * shape, for the same reason `Customer` lives there and `customers.ts` only
 * carries its endpoints.
 *
 * Two things about it are worth reading before editing anything here.
 *
 * **There is no create and no delete.** The set of plans is a closed union, and
 * everything that reads it — the filters, the badges, the saved views, the CSV
 * export — is written against those four members. Adding a fifth is a member in
 * `CUSTOMER_PLANS`, a label in `CUSTOMER_PLAN_LABELS`, an appearance in
 * `CustomerPlanBadge` and a seeded row of terms; the first three will not
 * compile without their entries, which is the point of keying them. What an
 * administrator does on this screen is re-price a plan that exists, and that is
 * a smaller thing on purpose.
 *
 * **A plan is a rung, so the catalogue is checked as a whole.** Price and seats
 * both have to run one way up `CUSTOMER_PLANS`, and neither is a fact about the
 * plan being edited — it is a fact about that plan *and its neighbours*. So the
 * check cannot live on the field, cannot live in the schema, and cannot honestly
 * live in a browser holding a copy of three other plans it did not just fetch:
 * `customerPlanLadderIssue` takes the whole proposed catalogue and the server is
 * what asks it. The interface renders the sentence it answers with, the same way
 * the ticket screens render a guard's `requirement` rather than composing one.
 */

/**
 * The bounds on the three editable fields.
 *
 * They are here rather than inline in the schema because the field that collects
 * each one reads them too — a `maxLength` on the description, a `max` on the
 * seat field — so a bound tightened here tightens the control as well as the
 * validation, instead of leaving a field that accepts what the server refuses.
 */
export const MAX_PLAN_MONTHLY_PRICE_PENCE = 999_999

export const MAX_PLAN_SEAT_LIMIT = 100_000

export const MAX_PLAN_DESCRIPTION_LENGTH = 160

/**
 * Spread into all three schemas below rather than extended from one, so that
 * annotating the terms with their domain type — which is what makes a missing
 * field a compile error — does not cost the other two their fields. The same
 * arrangement as `customerSummaryShape` in `customers.ts`, for the same reason.
 */
const planTermsShape = {
  monthlyPricePence: z.number().int().min(0).max(MAX_PLAN_MONTHLY_PRICE_PENCE),
  seatLimit: z.number().int().min(1).max(MAX_PLAN_SEAT_LIMIT).nullable(),
  description: z.string().trim().min(1).max(MAX_PLAN_DESCRIPTION_LENGTH),
}

export const customerPlanTermsSchema: z.ZodType<CustomerPlanTerms> = z.object({
  plan: customerPlanSchema,
  ...planTermsShape,
})

/**
 * What a plan edit carries, which is the terms and not the plan.
 *
 * The plan is in the path — `PATCH /api/plans/:plan` — because it is the thing
 * being addressed rather than a value being written. A `plan` in the body as
 * well would be a second spelling of the subject and a way to ask for the two to
 * disagree.
 *
 * Every field is required. This is not a patch: the screen edits a plan on a
 * form that shows all three, so a partial body would describe a request the
 * interface has no way to make and a field silently left at whatever it was.
 */
export const updateCustomerPlanBodySchema = z.object(planTermsShape)

export type UpdateCustomerPlanBody = z.infer<typeof updateCustomerPlanBodySchema>

/**
 * A plan as the catalogue screen reads it: its terms, and how many customers are
 * on it.
 *
 * The count is on the row rather than fetched beside it because it is what makes
 * the screen answerable — re-pricing Enterprise is a different decision at five
 * customers than at five hundred — and because the alternative is the client
 * asking for every customer in order to count them, which is the thing the
 * reports contract exists to avoid.
 */
export const customerPlanRowSchema = z.object({
  plan: customerPlanSchema,
  ...planTermsShape,
  customerCount: z.number().int().nonnegative(),
})

export type CustomerPlanRow = z.infer<typeof customerPlanRowSchema>

/**
 * Every plan, in domain order, on one response.
 *
 * No cursor, no page and no total: there are four rows and there will be four
 * rows, because the set is a closed union. A paging envelope here would be a
 * shape suggesting the opposite.
 */
export const listCustomerPlansResponseSchema = z.object({
  rows: z.array(customerPlanRowSchema),
})

export type ListCustomerPlansResponse = z.infer<typeof listCustomerPlansResponseSchema>

/* -------------------------------------------------------------------------- */
/* The ladder                                                                 */
/* -------------------------------------------------------------------------- */

/** The plans' terms, keyed by plan. What the ladder rules are asked about. */
export type CustomerPlanCatalogue = Record<CustomerPlan, CustomerPlanTerms>

export const CUSTOMER_PLAN_RULE_IDS = ['price', 'seats'] as const

export type CustomerPlanRuleId = (typeof CUSTOMER_PLAN_RULE_IDS)[number]

export interface CustomerPlanRule {
  id: CustomerPlanRuleId
  /**
   * The figure compared as you go up `CUSTOMER_PLANS`. It must never fall.
   *
   * A number rather than a comparator, so both rules are one loop over one
   * order. What a rule contributes is which figure it reads and what to say when
   * it falls, and neither of those is a way of walking the ladder.
   */
  measure: (terms: CustomerPlanTerms) => number
  /**
   * What has to be true, written as the sentence shown when it is not.
   *
   * It names the pair rather than the plan being edited, because the pair is
   * what is wrong: lowering Pro below Starter and raising Starter above Pro are
   * the same broken rung reached from either end, and a message naming only the
   * field somebody just typed in would send half of them to the wrong screen.
   */
  requirement: (below: CustomerPlan, above: CustomerPlan) => string
}

/**
 * Keyed by the union, so a rule named in `CUSTOMER_PLAN_RULE_IDS` without an
 * entry here is a compile error rather than a condition that quietly always
 * holds. The order of the union is the order they are reported in.
 */
export const CUSTOMER_PLAN_RULES: Record<CustomerPlanRuleId, CustomerPlanRule> = {
  price: {
    id: 'price',
    measure: (terms) => terms.monthlyPricePence,
    requirement: (below, above) =>
      `${CUSTOMER_PLAN_LABELS[above]} cannot cost less than ${CUSTOMER_PLAN_LABELS[below]}, because moving up the ladder would make a customer's bill go down. Lower ${CUSTOMER_PLAN_LABELS[below]} first, or price this one above it.`,
  },
  seats: {
    id: 'seats',
    // Unlimited is the top of this order and not a quantity, so it compares as
    // one rather than being special-cased in the walk below.
    measure: (terms) => terms.seatLimit ?? Number.POSITIVE_INFINITY,
    requirement: (below, above) =>
      `${CUSTOMER_PLAN_LABELS[above]} cannot carry fewer seats than ${CUSTOMER_PLAN_LABELS[below]}, because moving up the ladder would take a seat away. Lower ${CUSTOMER_PLAN_LABELS[below]} first, or raise this limit.`,
  },
}

export interface CustomerPlanLadderIssue {
  rule: CustomerPlanRuleId
  /** The lower of the two rungs that are out of order. */
  below: CustomerPlan
  above: CustomerPlan
  /** The rule's own sentence, filled in with the pair that broke it. */
  requirement: string
}

/** The first adjacent pair this rule reads out of order, lower rung first. */
function brokenRung(
  rule: CustomerPlanRule,
  catalogue: CustomerPlanCatalogue,
): [CustomerPlan, CustomerPlan] | null {
  for (let index = 1; index < CUSTOMER_PLANS.length; index += 1) {
    const below = CUSTOMER_PLANS[index - 1]
    const above = CUSTOMER_PLANS[index]

    if (rule.measure(catalogue[above]) < rule.measure(catalogue[below])) {
      return [below, above]
    }
  }

  return null
}

/**
 * Whether this catalogue reads as a ladder, and which rung does not if it does
 * not.
 *
 * Adjacent pairs rather than every pair: the order is transitive, so a run that
 * never falls between neighbours never falls at all, and the pair a person is
 * shown is then the one they can actually do something about. Equal rungs are
 * allowed — two plans at the same seat limit differ on price, and refusing that
 * would be a rule about variety rather than about order.
 *
 * Null means the catalogue is coherent, which is the same shape
 * `evaluateTicketMove` answers a permitted move with: nothing to say.
 */
export function customerPlanLadderIssue(
  catalogue: CustomerPlanCatalogue,
): CustomerPlanLadderIssue | null {
  for (const id of CUSTOMER_PLAN_RULE_IDS) {
    const rule = CUSTOMER_PLAN_RULES[id]
    const rung = brokenRung(rule, catalogue)

    if (rung !== null) {
      const [below, above] = rung

      return { rule: id, below, above, requirement: rule.requirement(below, above) }
    }
  }

  return null
}

/**
 * The catalogue as it would be with one plan's terms replaced.
 *
 * The edit and the check are separate on purpose: what has to be validated is
 * the catalogue an edit *would* produce, so producing it has to be something a
 * caller can do without having applied anything. A store that mutated first and
 * checked afterwards would need to know how to undo.
 */
export function withCustomerPlanTerms(
  catalogue: CustomerPlanCatalogue,
  plan: CustomerPlan,
  terms: UpdateCustomerPlanBody,
): CustomerPlanCatalogue {
  return { ...catalogue, [plan]: { plan, ...terms } }
}

/** The catalogue as rows, in domain order. What both the store and a test read. */
export function customerPlanTermsInDomainOrder(
  catalogue: CustomerPlanCatalogue,
): CustomerPlanTerms[] {
  return CUSTOMER_PLANS.map((plan) => catalogue[plan])
}
