import { describe, expect, it } from 'vitest'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { IGNORED, MIN_SHARE, RECORDED, WINDOW } from '../index.js'
import { keyOf, run } from '../run.js'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')

describe('the ratchet over this checkout', () => {
  const result = run(REPO_ROOT)

  it('reads the source of both workspaces', () => {
    expect(result.files).toBeGreaterThan(150)
    expect(result.unreadable).toEqual([])
  })

  it('has every pair over the line written down with a reason', () => {
    // This is the check itself: an unrecorded pair fails the build, and the
    // entry that clears it has to carry the argument for why it is allowed.
    expect(result.added).toEqual([])
  })

  it('has no entry recorded for a pair that is no longer there', () => {
    // A stale entry is a claim nobody has re-read. Deleting it is the one line
    // in a diff that says a copy was collapsed.
    expect(result.resolved).toEqual([])
  })

  it('still holds the copies it was written to find', () => {
    const keys = new Set(result.found.map(keyOf))

    expect(
      keys.has(
        keyOf({
          left: 'apps/web/src/features/customers/hooks/useBulkDeleteCustomers.ts',
          right: 'apps/web/src/features/tickets/hooks/useBulkDeleteTickets.ts',
        }),
      ),
    ).toBe(true)
  })
})

describe('what the threshold rules out, measured', () => {
  // The numbers in the README, pinned. A future change that quietly lowers the
  // threshold — or one that raises it past a pair it used to see — fails here
  // rather than being noticed by nobody.
  const result = run(REPO_ROOT, { minShare: 0 })
  const shareOf = (left, right) =>
    result.found.find((pair) => keyOf(pair) === keyOf({ left, right }))?.share ?? 0

  it('does not see a dialog copied and then half rewritten', () => {
    const share = shareOf(
      'apps/web/src/features/savedViews/SavedViewNameDialog.tsx',
      'apps/web/src/features/tickets/components/TicketMoveReasonDialog.tsx',
    )

    expect(share).toBeGreaterThan(0.4)
    expect(share).toBeLessThan(MIN_SHARE)
  })

  it('does not see a block of markup written out again inside a bigger file', () => {
    const share = shareOf(
      'apps/web/src/features/tickets/components/CommentList.tsx',
      'apps/web/src/features/tickets/components/TicketHistoryCard.tsx',
    )

    expect(share).toBeLessThan(0.2)
  })

  it('is quiet about Modal and Drawer, which share a Dialog rather than each other', () => {
    expect(
      shareOf(
        'packages/ui/src/components/Drawer/Drawer.tsx',
        'packages/ui/src/components/Modal/Modal.tsx',
      ),
    ).toBeLessThan(0.25)
  })

  it('is quiet about the two saved-view scopes, which are one mechanism twice configured', () => {
    expect(
      shareOf(
        'apps/web/src/features/customers/savedViews.ts',
        'apps/web/src/features/tickets/savedViews.ts',
      ),
    ).toBeLessThan(0.25)
  })
})

describe('the recorded list', () => {
  it('says which entries are a design and which are a copy still to collapse', () => {
    for (const entry of RECORDED) {
      expect(['parallel', 'duplication']).toContain(entry.kind)
      expect(entry.reason.length).toBeGreaterThan(20)
      expect(entry.left < entry.right).toBe(true)
    }
  })

  it('names no pair twice', () => {
    const keys = RECORDED.map(keyOf)

    expect(new Set(keys).size).toBe(keys.length)
  })

  it('keeps the thresholds where a reader can argue with them', () => {
    expect(WINDOW).toBeGreaterThan(0)
    expect(MIN_SHARE).toBeGreaterThan(0)
    expect(MIN_SHARE).toBeLessThanOrEqual(1)
    expect(IGNORED.some((pattern) => pattern.test('a/b/thing.test.ts'))).toBe(true)
    expect(IGNORED.some((pattern) => pattern.test('a/b/index.ts'))).toBe(true)
    expect(IGNORED.some((pattern) => pattern.test('a/b/thing.ts'))).toBe(false)
  })
})
