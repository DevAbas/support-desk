import { describe, expect, it } from 'vitest'
import {
  customerPlanLadderIssue,
  customerPlanTermsInDomainOrder,
  updateCustomerPlanBodySchema,
  withCustomerPlanTerms,
  CUSTOMER_PLAN_RULES,
  CUSTOMER_PLAN_RULE_IDS,
  MAX_PLAN_DESCRIPTION_LENGTH,
  MAX_PLAN_MONTHLY_PRICE_PENCE,
  MAX_PLAN_SEAT_LIMIT,
  type CustomerPlanCatalogue,
  type UpdateCustomerPlanBody,
} from './plans'
import { CUSTOMER_PLANS, CUSTOMER_PLAN_LABELS, type CustomerPlan } from './types'

/**
 * The ladder, tested as the data it is.
 *
 * The first describe is an **invariant over the whole table**: whatever rules
 * exist, each one has to be checkable, has to have something to say, and has to
 * agree that the seeded shape below is a coherent catalogue. It fails for a rule
 * that is wrong rather than for a function that is, which is the only way a
 * table gets held to anything. The rest are the specific refusals this product
 * decided on.
 *
 * Every figure in the fixture is different from every other, in both directions
 * and on both measures. A catalogue where two rungs shared a price would let
 * `<` be swapped for `<=` with nothing to notice, and one where the numbers ran
 * with the plans in the order they are written would pass just as happily if the
 * walk read the array backwards.
 */
const coherent: CustomerPlanCatalogue = {
  free: { plan: 'free', monthlyPricePence: 0, seatLimit: 3, description: 'One person.' },
  starter: { plan: 'starter', monthlyPricePence: 1_900, seatLimit: 10, description: 'A team.' },
  pro: { plan: 'pro', monthlyPricePence: 4_900, seatLimit: 50, description: 'A department.' },
  enterprise: {
    plan: 'enterprise',
    monthlyPricePence: 19_900,
    seatLimit: null,
    description: 'A company.',
  },
}

/** The catalogue with one plan changed, which is the only edit this screen has. */
function edited(plan: CustomerPlan, patch: Partial<UpdateCustomerPlanBody>): CustomerPlanCatalogue {
  const { monthlyPricePence, seatLimit, description } = coherent[plan]

  return withCustomerPlanTerms(coherent, plan, {
    monthlyPricePence,
    seatLimit,
    description,
    ...patch,
  })
}

describe('the shape of the ladder', () => {
  it('reads the seeded catalogue as coherent', () => {
    expect(customerPlanLadderIssue(coherent)).toBeNull()
  })

  it('gives every rule a sentence that names the pair that broke it', () => {
    for (const id of CUSTOMER_PLAN_RULE_IDS) {
      const requirement = CUSTOMER_PLAN_RULES[id].requirement('starter', 'pro')

      // Not a restatement of the table: a rule whose message says only that
      // something was refused tells somebody they are stuck, where one naming
      // both rungs tells them which two figures to look at.
      expect(requirement).toContain(CUSTOMER_PLAN_LABELS.starter)
      expect(requirement).toContain(CUSTOMER_PLAN_LABELS.pro)
    }
  })

  it('reads every rule off the plans in the order the domain lists them', () => {
    for (const id of CUSTOMER_PLAN_RULE_IDS) {
      const measured = CUSTOMER_PLANS.map((plan) => CUSTOMER_PLAN_RULES[id].measure(coherent[plan]))

      expect([...measured].sort((a, b) => a - b)).toEqual(measured)
    }
  })
})

describe('what the ladder refuses', () => {
  it('refuses a plan priced under the one below it', () => {
    const issue = customerPlanLadderIssue(edited('pro', { monthlyPricePence: 1_500 }))

    expect(issue?.rule).toBe('price')
    expect(issue?.below).toBe('starter')
    expect(issue?.above).toBe('pro')
  })

  it('refuses the same rung reached from the other end', () => {
    // Raising Starter over Pro and lowering Pro under Starter are one broken
    // rung, so they are one issue and one sentence.
    const issue = customerPlanLadderIssue(edited('starter', { monthlyPricePence: 9_900 }))

    expect(issue?.rule).toBe('price')
    expect(issue?.below).toBe('starter')
    expect(issue?.above).toBe('pro')
  })

  it('refuses a plan carrying fewer seats than the one below it', () => {
    const issue = customerPlanLadderIssue(edited('pro', { seatLimit: 4 }))

    expect(issue?.rule).toBe('seats')
    expect(issue?.below).toBe('starter')
    expect(issue?.above).toBe('pro')
  })

  it('refuses a seat limit under an unlimited plan below it', () => {
    // Unlimited is the top of the seat order rather than an absent value: a
    // limit put on Enterprise while Pro has none is a rung that falls.
    const issue = customerPlanLadderIssue({
      ...edited('pro', { seatLimit: null }),
      enterprise: { ...coherent.enterprise, seatLimit: 500 },
    })

    expect(issue?.rule).toBe('seats')
    expect(issue?.below).toBe('pro')
    expect(issue?.above).toBe('enterprise')
  })

  it('reports the price before the seats when both rungs are broken', () => {
    const issue = customerPlanLadderIssue(edited('pro', { monthlyPricePence: 0, seatLimit: 1 }))

    // One sentence at a time, in the order the union lists the rules, so the
    // dialog says one thing rather than everything.
    expect(issue?.rule).toBe('price')
  })

  it('allows two rungs to agree on one of the measures', () => {
    // Equal is not falling. Two plans at the same seat count differ on price,
    // and refusing that would be a rule about variety rather than about order.
    expect(customerPlanLadderIssue(edited('pro', { seatLimit: 10 }))).toBeNull()
  })

  it('allows a free plan under a paid one', () => {
    expect(customerPlanLadderIssue(edited('free', { monthlyPricePence: 0 }))).toBeNull()
  })
})

describe('applying an edit', () => {
  it('replaces one plan and leaves the rest of the catalogue alone', () => {
    const next = edited('pro', { monthlyPricePence: 5_900 })

    expect(next.pro.monthlyPricePence).toBe(5_900)
    expect(next.free).toEqual(coherent.free)
    expect(next.starter).toEqual(coherent.starter)
    expect(next.enterprise).toEqual(coherent.enterprise)
  })

  it('does not write the edit into the catalogue it was given', () => {
    // The check runs against a catalogue an edit *would* produce, so producing
    // one must not be the edit. A store that mutated here would have to undo.
    edited('pro', { monthlyPricePence: 5_900 })

    expect(coherent.pro.monthlyPricePence).toBe(4_900)
  })

  it('keeps the plan its own terms name, whatever the body carried', () => {
    expect(edited('pro', {}).pro.plan).toBe('pro')
  })

  it('lists the catalogue in domain order rather than in key order', () => {
    const shuffled: CustomerPlanCatalogue = {
      enterprise: coherent.enterprise,
      free: coherent.free,
      pro: coherent.pro,
      starter: coherent.starter,
    }

    expect(customerPlanTermsInDomainOrder(shuffled).map((terms) => terms.plan)).toEqual([
      ...CUSTOMER_PLANS,
    ])
  })
})

describe('what an edit is allowed to carry', () => {
  const valid = { monthlyPricePence: 4_900, seatLimit: 50, description: 'A department.' }

  it('accepts an unlimited seat count as null', () => {
    expect(updateCustomerPlanBodySchema.parse({ ...valid, seatLimit: null }).seatLimit).toBeNull()
  })

  it('trims the description rather than storing the spacing somebody typed', () => {
    expect(
      updateCustomerPlanBodySchema.parse({ ...valid, description: '  A department.  ' })
        .description,
    ).toBe('A department.')
  })

  it('refuses a price that is not whole pence', () => {
    expect(updateCustomerPlanBodySchema.safeParse({ ...valid, monthlyPricePence: 49.5 }).success)
      .toBe(false)
  })

  it('refuses a negative price', () => {
    expect(updateCustomerPlanBodySchema.safeParse({ ...valid, monthlyPricePence: -1 }).success).toBe(
      false,
    )
  })

  it('refuses a seat limit of nothing at all', () => {
    // Zero seats is not a plan anybody can be on, and it is not how "unlimited"
    // is spelled either.
    expect(updateCustomerPlanBodySchema.safeParse({ ...valid, seatLimit: 0 }).success).toBe(false)
  })

  it('refuses a blank description', () => {
    expect(updateCustomerPlanBodySchema.safeParse({ ...valid, description: '   ' }).success).toBe(
      false,
    )
  })

  it('refuses figures past the bounds the fields are built from', () => {
    const past = {
      monthlyPricePence: MAX_PLAN_MONTHLY_PRICE_PENCE + 1,
      seatLimit: MAX_PLAN_SEAT_LIMIT + 1,
      description: 'x'.repeat(MAX_PLAN_DESCRIPTION_LENGTH + 1),
    }

    for (const [field, value] of Object.entries(past)) {
      expect(updateCustomerPlanBodySchema.safeParse({ ...valid, [field]: value }).success).toBe(
        false,
      )
    }

    expect(updateCustomerPlanBodySchema.safeParse(past).success).toBe(false)
  })

  it('refuses a partial edit, because the form shows every field', () => {
    expect(updateCustomerPlanBodySchema.safeParse({ monthlyPricePence: 4_900 }).success).toBe(false)
  })
})
