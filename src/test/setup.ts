import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { apiTestStore, mswServer } from './msw/server'

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
