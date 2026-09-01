import type { Ticket, TicketComment, TicketPriority, TicketStatus } from '@support-desk/shared'

/**
 * The seed data is generated deterministically: the same 40 tickets, in the same
 * order, on every reload. That matters because this repo is used for recorded
 * walkthroughs, where a shuffling list would make two takes disagree.
 */

/**
 * mulberry32 — a small, fast, seedable PRNG.
 *
 * Exported so that `customerSeed.ts` generates its rows from the same one. A
 * second copy would be a second thing to keep deterministic.
 */
export function createRandom(seed: number): () => number {
  let state = seed

  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fixed reference point so the generated timestamps never drift. */
export const SEED_EPOCH = Date.parse('2026-08-01T09:00:00.000Z')

const DAY_IN_MS = 24 * 60 * 60 * 1000

const SUBJECTS: readonly { title: string; description: string }[] = [
  {
    title: 'Cannot sign in after password reset',
    description:
      'The reset email arrives and the new password is accepted, but signing in with it returns "invalid credentials". Clearing cookies does not help.',
  },
  {
    title: 'Invoice PDF downloads as a zero-byte file',
    description:
      'Downloading any invoice from the billing page produces a 0 KB PDF. The same invoice opens correctly in the email receipt.',
  },
  {
    title: 'Two-factor codes rejected on Android',
    description:
      'Codes from the authenticator app are rejected on Android only. The same account works on desktop with the same code.',
  },
  {
    title: 'Export to CSV times out for large workspaces',
    description:
      'Workspaces above roughly 50,000 rows never finish exporting. The progress bar reaches 90% and then the request drops.',
  },
  {
    title: 'Webhook deliveries retry indefinitely',
    description:
      'A webhook endpoint returning 410 keeps being retried every few minutes instead of being disabled after the documented five failures.',
  },
  {
    title: 'Search returns archived items',
    description:
      'Archived projects show up in global search results even with the archive filter switched off.',
  },
  {
    title: 'Timezone shown incorrectly on scheduled reports',
    description:
      'Scheduled reports display times in UTC in the summary email but in local time in the app, so the two disagree by several hours.',
  },
  {
    title: 'Bulk import silently skips rows with commas',
    description:
      'Rows whose description contains a comma are dropped during CSV import. No error is reported and the summary count is wrong.',
  },
  {
    title: 'Session expires after five minutes of inactivity',
    description:
      'Sessions are ending far sooner than the configured 24 hours. Started after the last release.',
  },
  {
    title: 'Attachments over 10 MB fail without a message',
    description:
      'Uploading a large attachment shows the spinner indefinitely. The network tab shows a 413 that never surfaces in the UI.',
  },
  {
    title: 'Email notifications sent twice',
    description:
      'Every assignment notification arrives twice, roughly thirty seconds apart, to all recipients.',
  },
  {
    title: 'Dark mode unreadable in the settings panel',
    description:
      'Several labels in the settings panel keep their light-mode colour, leaving grey text on a dark background.',
  },
  {
    title: 'API rate limit headers missing',
    description:
      'The documented X-RateLimit-Remaining header is absent from API responses, so clients cannot back off correctly.',
  },
  {
    title: 'Sorting by date orders lexically',
    description:
      'The created-date column sorts as text, so 9 September lands before 10 August.',
  },
  {
    title: 'Deleted members still receive digests',
    description:
      'Members removed from the workspace keep receiving the weekly digest email for at least two weeks after removal.',
  },
  {
    title: 'Keyboard focus lost after closing a dialog',
    description:
      'Closing a confirmation dialog drops focus to the top of the document instead of returning it to the trigger.',
  },
  {
    title: 'Custom domain verification stuck as pending',
    description:
      'DNS records are correct and propagated, but the domain has been stuck in "pending verification" for three days.',
  },
  {
    title: 'Mobile layout overflows on small screens',
    description:
      'The dashboard scrolls horizontally on devices narrower than 360px because of a fixed-width summary card.',
  },
  {
    title: 'Slack integration posts to the wrong channel',
    description:
      'After renaming a Slack channel, notifications continue to be posted to the old channel ID.',
  },
  {
    title: 'Duplicate tickets created from a single email',
    description:
      'Emails with both a To and a Cc pointing at the support address create two tickets instead of one thread.',
  },
  {
    title: 'Cannot remove the last admin',
    description:
      'Removing the last admin is blocked as expected, but the error text says "unknown error" rather than explaining why.',
  },
  {
    title: 'Saved filters reset on page reload',
    description:
      'Filters applied to the ticket list are lost on refresh, though the URL still contains the query parameters.',
  },
  {
    title: 'Billing page shows the wrong currency',
    description:
      'An account billed in EUR shows totals with a dollar sign. The invoice PDF has the correct symbol.',
  },
  {
    title: 'Uploaded avatars appear rotated',
    description:
      'Photos taken in portrait orientation on iOS are displayed sideways because EXIF orientation is ignored.',
  },
  {
    title: 'Audit log missing permission changes',
    description:
      'Role changes made through the API do not appear in the audit log, though the same change made in the UI does.',
  },
  {
    title: 'Autocomplete suggests deactivated users',
    description:
      'The assignee autocomplete offers deactivated accounts, and picking one leaves the ticket unassigned.',
  },
  {
    title: 'Report totals disagree with the exported file',
    description:
      'The summary report shows 1,204 resolved tickets while the export of the same range contains 1,197 rows.',
  },
  {
    title: 'SSO login loops back to the sign-in page',
    description:
      'After authenticating with the identity provider, users are redirected to the sign-in page instead of the dashboard.',
  },
  {
    title: 'Comment drafts lost when switching tickets',
    description:
      'An unsent comment is discarded without warning when navigating to another ticket and back.',
  },
  {
    title: 'Print stylesheet cuts off long tables',
    description:
      'Printing a ticket list truncates the table at the first page break rather than continuing onto page two.',
  },
  {
    title: 'Pagination shows a page that does not exist',
    description:
      'Deleting the only item on the final page leaves the paginator pointing at an empty page instead of stepping back.',
  },
  {
    title: 'Status filter ignores the "closed" option',
    description:
      'Selecting the closed status returns the unfiltered list. The other three statuses filter correctly.',
  },
  {
    title: 'API returns 500 for empty request bodies',
    description:
      'Posting an empty body to the tickets endpoint returns a 500 rather than a 400 with a validation message.',
  },
  {
    title: 'Notification preferences do not persist',
    description:
      'Toggling email notifications off shows a success toast, but the setting is back on after signing out and in.',
  },
  {
    title: 'Long assignee names break the table layout',
    description:
      'Names longer than about forty characters push the actions column off the right edge of the table.',
  },
  {
    title: 'Trial banner shown to paying customers',
    description:
      'Accounts that upgraded mid-trial keep seeing the "your trial ends in 3 days" banner until they clear local storage.',
  },
  {
    title: 'Merge tickets loses the original timestamps',
    description:
      'Merging two tickets rewrites every comment timestamp to the merge time, so the history reads out of order.',
  },
  {
    title: 'Copy-to-clipboard fails over plain HTTP',
    description:
      'The copy button on the API key page silently does nothing on self-hosted instances served over HTTP.',
  },
  {
    title: 'Screen reader announces the table twice',
    description:
      'The ticket table is announced once as a table and once as a list, because of a duplicated ARIA role on the wrapper.',
  },
  {
    title: 'Password rules not shown until submit',
    description:
      'The password requirements only appear after a failed submit, so users have to guess them on the first attempt.',
  },
]

const ASSIGNEES: readonly string[] = [
  'Dana Whitfield',
  'Marco Ellis',
  'Priya Raman',
  'Tomas Lindqvist',
  'Aisha Bello',
  'Ren Nakamura',
  'Unassigned',
]

const REPORTERS: readonly string[] = [
  'Jordan Avery',
  'Sam Okonkwo',
  'Lena Fischer',
  'Chris Doyle',
]

const COMMENT_BODIES: readonly string[] = [
  'Thanks for the report — I can reproduce this on staging.',
  'Could you confirm which browser and version you are on?',
  'Reassigning to the platform team, this looks server side.',
  'Workaround for now: sign out fully and sign back in.',
  'This is tracked upstream, waiting on the next dependency release.',
  'Fix is merged and will ship in the next release.',
  'Closing as duplicate of an earlier report from the same account.',
  'I have attached the request log from the failing call.',
  'Cannot reproduce on the latest build — has this cleared for you?',
  'Bumping priority, three more accounts reported the same thing today.',
]

const STATUS_WEIGHTS: readonly TicketStatus[] = [
  'open',
  'open',
  'open',
  'pending',
  'pending',
  'resolved',
  'resolved',
  'closed',
]

const PRIORITY_WEIGHTS: readonly TicketPriority[] = [
  'low',
  'low',
  'medium',
  'medium',
  'medium',
  'high',
]

/** Picks an element deterministically. The arrays above are never empty. */
function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)] as T
}

export function createSeedTickets(): Ticket[] {
  const random = createRandom(20260801)

  return SUBJECTS.map((subject, index) => {
    const createdOffsetDays = 60 - index * 1.5 - random()
    const createdAt = new Date(SEED_EPOCH - createdOffsetDays * DAY_IN_MS)
    const status = pick(STATUS_WEIGHTS, random)

    // Resolved and closed tickets have been discussed; a few open ones have not.
    const commentCount =
      status === 'resolved' || status === 'closed'
        ? 2 + Math.floor(random() * 3)
        : Math.floor(random() * 3)

    const comments: TicketComment[] = Array.from({ length: commentCount }, (_, commentIndex) => ({
      id: `c-${index + 1}-${commentIndex + 1}`,
      author: commentIndex === 0 ? pick(REPORTERS, random) : pick(ASSIGNEES, random),
      body: pick(COMMENT_BODIES, random),
      createdAt: new Date(
        createdAt.getTime() + (commentIndex + 1) * (6 + random() * 18) * 60 * 60 * 1000,
      ).toISOString(),
    }))

    return {
      id: `TCK-${String(index + 1).padStart(4, '0')}`,
      title: subject.title,
      description: subject.description,
      status,
      priority: pick(PRIORITY_WEIGHTS, random),
      assignee: pick(ASSIGNEES, random),
      createdAt: createdAt.toISOString(),
      comments,
    }
  })
}
