import { useCallback, useState } from 'react'
import type { CustomerFilters } from '@/features/customers/customerFilters'
import {
  createSavedSegment,
  readSavedSegments,
  writeSavedSegments,
  type CustomerSegment,
} from '@/features/customers/customerSegments'

interface UseCustomerSegmentsResult {
  segments: CustomerSegment[]
  /** Returns the new segment so the caller can make it the active one. */
  saveSegment: (name: string, filters: CustomerFilters) => CustomerSegment
  renameSegment: (id: string, name: string) => void
  deleteSegment: (id: string) => void
}

/**
 * The segments a person has, mirrored into localStorage on every change.
 *
 * The hook owns the collection and nothing else: which segment is active, and
 * whether the filters on screen still match it, belong to the screen — see
 * `CustomersPage`.
 */
export function useCustomerSegments(): UseCustomerSegmentsResult {
  // Read once, lazily: storage is synchronous and only changes through here.
  const [segments, setSegments] = useState<CustomerSegment[]>(readSavedSegments)

  const commit = useCallback((next: CustomerSegment[]) => {
    setSegments(next)
    writeSavedSegments(next)
  }, [])

  const saveSegment = useCallback(
    (name: string, filters: CustomerFilters) => {
      const segment = createSavedSegment(name, filters)
      commit([...segments, segment])
      return segment
    },
    [commit, segments],
  )

  const renameSegment = useCallback(
    (id: string, name: string) => {
      commit(
        segments.map((segment) =>
          segment.id === id ? { ...segment, name: name.trim() } : segment,
        ),
      )
    },
    [commit, segments],
  )

  const deleteSegment = useCallback(
    (id: string) => {
      commit(segments.filter((segment) => segment.id !== id))
    },
    [commit, segments],
  )

  return { segments, saveSegment, renameSegment, deleteSegment }
}
