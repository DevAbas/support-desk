import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Which customer's drawer is open, held in the URL.
 *
 * It was `useState` on `CustomersPage`, and it moved for one reason: the global
 * search has to be able to *take* you to a customer, and a customer has no route
 * of its own — the drawer is a glance taken over the list, which is why it was
 * never one. A search result that landed on an unfiltered list and left you to
 * find the person again is not the search taking you anywhere.
 *
 * The alternative was router state, or a second way of opening the drawer beside
 * the first. Both make the drawer two sources for one fact, which is the shape
 * of defect this codebase keeps writing down. So there is one source, and it is
 * the URL.
 *
 * **Every write replaces rather than pushes**, which is what keeps the original
 * decision intact. Opening a customer from the list is still not a history
 * entry: back goes wherever you were before the list, not through the dozen
 * people you glanced at on it.
 */
export const OPEN_CUSTOMER_PARAM = 'customer'

/** Where the search sends someone who picked a customer. */
export function customerPath(id: string): string {
  return `/customers?${OPEN_CUSTOMER_PARAM}=${encodeURIComponent(id)}`
}

export interface OpenCustomer {
  /** Null while the drawer is closed. */
  id: string | null
  open: (id: string) => void
  close: () => void
  /**
   * Closes the drawer only if what is open is one of these.
   *
   * Read through the URL as it is now rather than off a render's closure: a bulk
   * delete is in flight for a while, and Escape dismisses the confirmation
   * behind it — so what is open when the request comes back is not necessarily
   * what was open when it went out.
   */
  closeIfAmong: (ids: readonly string[]) => void
}

export function useOpenCustomer(): OpenCustomer {
  const [searchParams, setSearchParams] = useSearchParams()

  const write = useCallback(
    (decide: (current: URLSearchParams) => string | null) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          const id = decide(current)

          if (id === null) {
            next.delete(OPEN_CUSTOMER_PARAM)
          } else {
            next.set(OPEN_CUSTOMER_PARAM, id)
          }

          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  return {
    id: searchParams.get(OPEN_CUSTOMER_PARAM),
    open: (id) => write(() => id),
    close: () => write(() => null),
    closeIfAmong: (ids) =>
      write((current) => {
        const open = current.get(OPEN_CUSTOMER_PARAM)

        return open !== null && ids.includes(open) ? null : open
      }),
  }
}
