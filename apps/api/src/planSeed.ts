import { CUSTOMER_PLANS, type CustomerPlanCatalogue } from '@support-desk/shared'

/**
 * The plan catalogue this product starts up with.
 *
 * Written out rather than generated, unlike the tickets and the customers. A
 * price list is four facts somebody decided, not sixty rows that only have to
 * look plausible — and the numbers here are the ones the ladder rules are
 * demonstrated against, so a random price would make the screen's own refusals
 * depend on the seed.
 *
 * They still have to differ on every measure, for the reason the seed generators
 * exist at all: a catalogue where two plans shared a price would let a
 * comparison in `customerPlanLadderIssue` be inverted with nothing on this
 * screen to notice.
 *
 * Keyed by plan and typed as the whole catalogue, so a fifth member of
 * `CUSTOMER_PLANS` fails to compile here rather than starting the server with a
 * plan that has no price.
 */
const SEED_PLAN_TERMS: CustomerPlanCatalogue = {
  free: {
    plan: 'free',
    monthlyPricePence: 0,
    seatLimit: 3,
    description: 'Raise a ticket and read the answer. For one person trying the product.',
  },
  starter: {
    plan: 'starter',
    monthlyPricePence: 1_900,
    seatLimit: 10,
    description: 'A shared queue and saved views, for a team handling its own support.',
  },
  pro: {
    plan: 'pro',
    monthlyPricePence: 4_900,
    seatLimit: 50,
    description: 'Reporting and bulk actions, for a department running support as a job.',
  },
  enterprise: {
    plan: 'enterprise',
    monthlyPricePence: 19_900,
    seatLimit: null,
    description: 'Everything, with no seat limit and a named contact on our side.',
  },
}

/**
 * A fresh copy of the seed, rows included.
 *
 * The rows are copied as well as the record holding them, because the store
 * replaces a plan's terms wholesale on an edit but a test that reset between
 * cases would otherwise be handed the same objects the last one changed.
 */
export function createSeedPlanCatalogue(): CustomerPlanCatalogue {
  return Object.fromEntries(
    CUSTOMER_PLANS.map((plan) => [plan, { ...SEED_PLAN_TERMS[plan] }]),
  ) as CustomerPlanCatalogue
}
