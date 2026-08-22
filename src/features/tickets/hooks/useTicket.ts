import { useCallback, useEffect, useState } from 'react'
import { getTicket } from '../../../lib/api'
import type { Ticket } from '../../../lib/types'

interface UseTicketResult {
  ticket: Ticket | null
  isLoading: boolean
  error: string | null
  /** Replaces the loaded ticket, for use after a successful mutation. */
  setTicket: (ticket: Ticket) => void
  reload: () => void
}

export function useTicket(id: string | undefined): UseTicketResult {
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (!id) {
      setTicket(null)
      setIsLoading(false)
      setError('No ticket was requested.')
      return
    }

    let cancelled = false

    setIsLoading(true)
    setError(null)

    getTicket(id)
      .then((next) => {
        if (!cancelled) {
          setTicket(next)
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Could not load this ticket.')
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
  }, [id, reloadToken])

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1)
  }, [])

  return { ticket, isLoading, error, setTicket, reload }
}
