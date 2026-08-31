import { useLocation } from 'react-router-dom'

/**
 * Where the router is, as something a test can read.
 *
 * Picking a search result is a navigation and nothing else, so the address is
 * what most of those cases assert on. Rendered beside the component under test
 * rather than rendering the whole route tree: what they are about is where the
 * search chose to go, not what the screen at the other end draws.
 *
 * The component is the only thing this file exports, because a module that
 * exports a component and something else defeats fast refresh — which is what
 * `react-refresh/only-export-components` is for. Reading it back is one line in
 * the test that renders it.
 */
export function CurrentLocation() {
  const location = useLocation()

  return <p data-testid="location">{`${location.pathname}${location.search}`}</p>
}
