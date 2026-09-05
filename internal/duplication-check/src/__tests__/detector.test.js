import { describe, expect, it } from 'vitest'
import { findClonePairs } from '../detector.js'
import { shapeOf } from '../shape.js'

const shape = (path, source) => ({ path, ...shapeOf(source, path) })

/** A hook that deletes a selection and drops the detail keys. The original. */
const TICKETS = `
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { bulkDeleteTickets } from '@/lib/api/tickets'
import { ticketKeys } from '@/features/tickets/ticketKeys'

export function useBulkDeleteTickets() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: bulkDeleteTickets,
    onSuccess: (_result, { ids }) => {
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: ticketKeys.detail(id) })
      }

      return queryClient.invalidateQueries({ queryKey: ticketKeys.lists() })
    },
  })
}
`

/** The same file with the nouns changed, which is the defect being detected. */
const CUSTOMERS = TICKETS.replaceAll('icket', 'ustomer')
  .replaceAll('Ticket', 'Customer')
  .replaceAll('tickets', 'customers')

describe('a file copied and renamed', () => {
  it('is found, because renaming does not change the shape', () => {
    const pairs = findClonePairs([shape('a.ts', TICKETS), shape('b.ts', CUSTOMERS)], {
      window: 25,
      minShare: 0.85,
    })

    expect(pairs).toHaveLength(1)
    expect(pairs[0].share).toBe(1)
  })

  it('is still found when the copy grows a docblock, because comments are not shape', () => {
    const documented = `/**\n * Removes a selection of customers.\n *\n * The detail entries are dropped\n * rather than refetched.\n */\n${CUSTOMERS}`

    const pairs = findClonePairs([shape('a.ts', TICKETS), shape('b.ts', documented)], {
      window: 25,
      minShare: 0.85,
    })

    expect(pairs).toHaveLength(1)
  })

  it('is reported as a share of each file, so the smaller one is what the threshold reads', () => {
    const withMore = `${CUSTOMERS}\nexport function somethingElse(a, b) {\n  if (a > b) return a\n  if (b > a) return b\n  return a + b\n}\n`

    const [pair] = findClonePairs([shape('a.ts', TICKETS), shape('b.ts', withMore)], {
      window: 25,
      minShare: 0.5,
    })

    expect(pair.leftShare).toBe(1)
    expect(pair.rightShare).toBeLessThan(1)
    expect(pair.share).toBe(pair.rightShare)
  })
})

describe('what is deliberately not a clone', () => {
  it('two files doing the same job in different shapes', () => {
    const loop = 'export function total(rows) {\n  let sum = 0\n  for (const row of rows) {\n    sum += row.value\n  }\n  return sum\n}\n'
    const reduce = 'export function total(rows) {\n  return rows.reduce((sum, row) => sum + row.value, 0)\n}\n'

    expect(findClonePairs([shape('a.ts', loop), shape('b.ts', reduce)], {
      window: 25,
      minShare: 0.85,
    })).toEqual([])
  })

  it('a file too short for one window, which is coincidence rather than a copy', () => {
    const tiny = "export const a = 1\nexport const b = 2\n"

    expect(findClonePairs([shape('a.ts', tiny), shape('b.ts', tiny)], {
      window: 25,
      minShare: 0.85,
    })).toEqual([])
  })

  it('a shared opening with a different body, which is what the share threshold is for', () => {
    const opening = "import { useMutation, useQueryClient } from '@tanstack/react-query'\nimport { thing } from '@/lib/api/thing'\n"
    const first = `${opening}export function useA() {\n  const queryClient = useQueryClient()\n  return useMutation({ mutationFn: thing })\n}\n`
    const second = `${opening}export function useB(rows) {\n  const seen = new Map()\n  for (const row of rows) {\n    if (seen.has(row.id)) continue\n    seen.set(row.id, row)\n  }\n  return [...seen.values()]\n}\n`

    expect(findClonePairs([shape('a.ts', first), shape('b.ts', second)], {
      window: 25,
      minShare: 0.85,
    })).toEqual([])
  })
})

describe('the shape a file is reduced to', () => {
  it('erases names and strings, which is the whole mechanism', () => {
    const one = shapeOf("const ticketLabel = 'Open ticket'\n", 'a.ts')
    const two = shapeOf("const customerPlan = 'Enterprise plan'\n", 'b.ts')

    expect(one.types).toEqual(two.types)
  })

  it('keeps structure, so a different construction is a different shape', () => {
    const one = shapeOf('const a = rows.map((row) => row.id)\n', 'a.ts')
    const two = shapeOf('const a = []\nfor (const row of rows) a.push(row.id)\n', 'b.ts')

    expect(one.types).not.toEqual(two.types)
  })

  it('reads TSX, which is most of what could be copied here', () => {
    const { types } = shapeOf('export const a = <Badge status="info">{label}</Badge>\n', 'a.tsx')

    expect(types).toContain('JSXElement')
  })

  it('records a line per node, so a report can name somewhere', () => {
    const { types, lines } = shapeOf('const a = 1\n\nconst b = 2\n', 'a.ts')

    expect(lines).toHaveLength(types.length)
    expect(Math.max(...lines)).toBe(3)
  })
})
