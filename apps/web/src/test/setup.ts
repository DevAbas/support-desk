import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { apiTestStore, mswServer } from './msw/server'

/**
 * jsdom has no layout, and so no ResizeObserver. The charting library behind
 * `design-system/Chart` measures its container with one, so without this a
 * screen holding a chart cannot render here at all. A stub that never reports a
 * size is enough: a chart is asserted on through the data table it renders
 * beside itself, never through its SVG.
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

afterEach(() => {
  cleanup()
  // Both of the things a test can leave behind: a one-off handler, and a queue
  // it has been adding to and deleting from.
  mswServer.resetHandlers()
  apiTestStore.reset()
})

afterAll(() => {
  mswServer.close()
})
