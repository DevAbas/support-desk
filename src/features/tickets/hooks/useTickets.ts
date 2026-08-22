import { useCallback, useEffect, useState } from 'react'
import { listTickets, type ListTicketsParams, type ListTicketsResult } from '../../../lib/api'

interface UseTicketsResult {
  result: ListTicketsResult | null
  isLoading: boolean
  error: string | null
  reload: () => void
}

export function useTickets({
  page = 1,
  pageSize = 10,
  status = 'all',
  priority = 'all',
  search = '',
}: ListTicketsParams): UseTicketsResult {
  const [result, setResult] = useState<ListTicketsResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    setIsLoading(true)
    setError(null)

    listTickets({ page, pageSize, status, priority, search })
      .then((next) => {
        if (!cancelled) {
          setResult(next)
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Could not load tickets.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [page, pageSize, status, priority, search, reloadToken])

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1)
  }, [])

  return { result, isLoading, error, reload }
}
