import { useEffect, useState } from 'react'

/**
 * Follows a value, but only once it has stopped changing for `delayMs`.
 *
 * Used to keep a text field instant while what it drives — a query, and the
 * cache key built from it — waits for a pause in typing. The first value is
 * returned immediately: a debounce should not delay the first render.
 */
export function useDebouncedValue<TValue>(value: TValue, delayMs: number): TValue {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)

    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
