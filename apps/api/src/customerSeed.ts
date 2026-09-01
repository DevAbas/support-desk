import type { CustomerPlan, CustomerSummary, Ticket } from '@support-desk/shared'
import { createRandom, createSeedTickets, SEED_EPOCH } from './seed'

/**
 * The seed customers: the same sixty people, in the same order, on every reload,
 * generated from the same PRNG the ticket seed uses and for the same reason.
 *
 * **How a customer comes to have tickets.** The queue records who a ticket is
 * assigned to and who has spoken on it, and nothing else about who it is for —
 * there is no reporter field. So the join is a name: a ticket belongs to the
 * customer who shares a name with its assignee, or, when it is unassigned, with
 * whoever opened the conversation on it. Every one of those names is seeded as a
 * customer, which is what makes the link exist at all.
 *
 * A ticket belongs to one customer, not to everyone named on it, so the counts
 * add up: the sixty customers between them hold the whole queue exactly once.
 *
 * Most customers have no tickets. That is not a gap in the seed — there are
 * forty tickets and sixty customers, so most people here have never raised one,
 * which is also true of most customers of most products.
 */

/** A customer as stored: the tickets are a list of ids, resolved on the way out. */
export interface CustomerRecord extends Omit<CustomerSummary, 'ticketCount'> {
  ticketIds: string[]
}

const CUSTOMER_COUNT = 60

const DAY_IN_MS = 24 * 60 * 60 * 1000

const FIRST_NAMES: readonly string[] = [
  'Elena',
  'Nathan',
  'Yusuf',
  'Clara',
  'Diego',
  'Mei',
  'Oscar',
  'Ingrid',
  'Rafael',
  'Nadia',
]

/**
 * Seven, against ten first names. The two counts share no factor, which is what
 * `fillerNames` relies on to pair them off without repeating.
 */
const LAST_NAMES: readonly string[] = [
  'Harper',
  'Okafor',
  'Vasquez',
  'Lindberg',
  'Moreau',
  'Castellano',
  'Ferreira',
]

/** Three customers to a company, which is what a business account looks like. */
const COMPANIES: readonly string[] = [
  'Northwind Labs',
  'Cobalt Health',
  'Riverbend Logistics',
  'Halcyon Studios',
  'Fernwood Analytics',
  'Sable & Finch',
  'Lantern Bio',
  'Kestrel Freight',
  'Meridian Type',
  'Alder Grove Coop',
  'Pinnacle Survey',
  'Solstice Retail',
  'Ironvale Energy',
  'Bluepeak Travel',
  'Verdant Foods',
  'Tessellate Design',
  'Quarry Road Media',
  'Wexford Insurance',
  'Juniper Schools',
  'Crestline Robotics',
]

/**
 * Weighted so that most accounts are on the cheap end of the price list, which
 * is the shape that makes a plan filter worth having: filtering to Enterprise
 * should narrow the list to a handful, not halve it.
 */
const PLAN_WEIGHTS: readonly CustomerPlan[] = [
  'free',
  'free',
  'free',
  'free',
  'starter',
  'starter',
  'starter',
  'pro',
  'pro',
  'enterprise',
]

/** Picks an element deterministically. The arrays above are never empty. */
function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)] as T
}

function toIsoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/**
 * The customer a ticket belongs to, by name: its assignee, or — when nobody is
 * assigned — whoever opened the conversation on it.
 */
function ticketOwnerName(ticket: Ticket): string | undefined {
  if (ticket.assignee !== 'Unassigned') {
    return ticket.assignee
  }

  return ticket.comments[0]?.author
}

/** Every name the queue mentions, in the order the queue mentions them. */
function namesInTickets(tickets: readonly Ticket[]): string[] {
  const names: string[] = []

  for (const ticket of tickets) {
    const name = ticketOwnerName(ticket)

    if (name !== undefined && !names.includes(name)) {
      names.push(name)
    }
  }

  return names
}

/**
 * Made-up names to fill the roster out, skipping any the queue already
 * contributed so that no two customers share one — an email address is derived
 * from a name below, and two people cannot have the same one.
 */
function fillerNames(taken: readonly string[], count: number): string[] {
  const names: string[] = []
  const combinations = FIRST_NAMES.length * LAST_NAMES.length

  // Both names advance on every step. Ten and seven share no factor, so the
  // pair does not come round again until all seventy have been used, where
  // nesting the two loops would have produced ten Harpers in a row.
  for (let index = 0; index < combinations && names.length < count; index += 1) {
    const first = FIRST_NAMES[index % FIRST_NAMES.length] as string
    const last = LAST_NAMES[index % LAST_NAMES.length] as string
    const name = `${first} ${last}`

    if (!taken.includes(name)) {
      names.push(name)
    }
  }

  return names
}

/**
 * The sixty names, with the ones the queue mentions spaced evenly through the
 * rest rather than banked at the front.
 *
 * Order is signup order here — the row built from the first name is the newest
 * signup — so leaving the linked names where `namesInTickets` found them would
 * put every customer who has ever raised a ticket on the first page, and make
 * every page after it look like a different product.
 */
function buildRoster(tickets: readonly Ticket[]): string[] {
  const linked = namesInTickets(tickets)
  const filler = fillerNames(linked, CUSTOMER_COUNT - linked.length)
  const spacing = Math.floor(CUSTOMER_COUNT / Math.max(linked.length, 1))

  let nextLinked = 0
  let nextFiller = 0

  return Array.from({ length: CUSTOMER_COUNT }, (_, index) => {
    const takeLinked = index % spacing === 0 && nextLinked < linked.length

    if (takeLinked) {
      nextLinked += 1
      return linked[nextLinked - 1] as string
    }

    nextFiller += 1
    return filler[nextFiller - 1] as string
  })
}

function toEmail(name: string, company: string): string {
  const local = name.toLowerCase().replace(/[^a-z]+/g, '.')
  // `.example` is reserved for exactly this, so nothing here can be mistaken for
  // a real address or accidentally sent to one.
  const domain = company.toLowerCase().replace(/[^a-z0-9]+/g, '')

  return `${local}@${domain}.example`
}

/**
 * A stand-in for a photograph the customer uploaded, as a data URI so that the
 * app has no image host to reach and nothing to fail offline or in a test.
 *
 * The colour is an hsl value rather than a design token on purpose: this is a
 * picture of a person, not part of the interface, and a token would imply the
 * design system had an opinion about what someone's face looks like.
 */
function avatarDataUri(hue: number): string {
  const tint = `hsl(${String(hue)} 60% 88%)`
  const figure = `hsl(${String(hue)} 45% 42%)`
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="presentation">` +
    `<rect width="64" height="64" fill="${tint}"/>` +
    `<circle cx="32" cy="25" r="12" fill="${figure}"/>` +
    `<path d="M8 64c0-13.3 10.7-22 24-22s24 8.7 24 22z" fill="${figure}"/>` +
    `</svg>`

  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/**
 * When they signed up.
 *
 * Spread back over roughly two years, newest first, so the list is already in
 * cursor order as it is built. A customer who has tickets is then moved back far
 * enough to have existed before the earliest of them: a support request that
 * predates the account it was raised from is the kind of detail that makes a
 * reference dataset stop being worth reasoning about.
 */
function toSignupDate(index: number, random: () => number, tickets: readonly Ticket[]): string {
  const spreadMs = (30 + index * 12 + random() * 8) * DAY_IN_MS
  const earliestTicketMs = tickets.reduce(
    (earliest, ticket) => Math.min(earliest, Date.parse(ticket.createdAt)),
    Number.POSITIVE_INFINITY,
  )

  return toIsoDate(Math.min(SEED_EPOCH - spreadMs, earliestTicketMs - 7 * DAY_IN_MS))
}

export function createSeedCustomers(): CustomerRecord[] {
  const random = createRandom(20260802)
  const tickets = createSeedTickets()
  const roster = buildRoster(tickets)

  return roster.map((name, index) => {
    const company = COMPANIES[index % COMPANIES.length] as string
    const owned = tickets.filter((ticket) => ticketOwnerName(ticket) === name)
    const plan = pick(PLAN_WEIGHTS, random)
    // Roughly one customer in four has uploaded a picture; the rest are drawn
    // from their initials, which is the path this app actually renders.
    const hasAvatar = random() < 0.25

    return {
      id: `CUS-${String(index + 1).padStart(4, '0')}`,
      name,
      company,
      email: toEmail(name, company),
      avatarUrl: hasAvatar ? avatarDataUri(Math.floor(random() * 360)) : null,
      plan,
      signupDate: toSignupDate(index, random, owned),
      ticketIds: owned.map((ticket) => ticket.id),
    }
  })
}
