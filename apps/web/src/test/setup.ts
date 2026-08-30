import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import {
  apiTestCustomerStore,
  apiTestSessionStore,
  apiTestStore,
  apiTestUserStore,
  mswServer,
  signInTestUser,
} from './msw/server'

/**
 * jsdom has no layout, and so no ResizeObserver. The charting library behind
 * `BarChart` in `@harness-sample/ui` measures its container with one, so
 * without this a screen holding a chart cannot render here at all. A stub that
 * never reports a size is enough: a chart is asserted on through the data table
 * it renders beside itself, never through its SVG.
 */
class ResizeObserverStub implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver ??= ResizeObserverStub

beforeAll(() => {
  // A request nobody wrote a handler for is a mistake, not something to let
  // through to the network from a test run.
  mswServer.listen({ onUnhandledRequest: 'error' })
})

/**
 * Every test starts signed in, because almost none of them are about signing in.
 *
 * The API refuses an unauthenticated request now, so without this every screen
 * test would begin by arranging a session — the same four lines, in eight files,
 * describing something none of them are testing. The two auth test files call
 * `signOutTestUser` to opt out.
 */
beforeEach(() => {
  signInTestUser()
})

afterEach(() => {
  cleanup()
  // Everything a test can leave behind: a one-off handler, a queue it has been
  // adding to and deleting from, and a customer list it has been bulk-editing.
  mswServer.resetHandlers()
  apiTestStore.reset()
  apiTestCustomerStore.reset()
  // And the accounts a registration test added, with the sessions they were
  // given: a duplicate-email test that ran twice would otherwise pass for the
  // wrong reason the second time.
  apiTestUserStore.reset()
  apiTestSessionStore.reset()
})

afterAll(() => {
  mswServer.close()
})
