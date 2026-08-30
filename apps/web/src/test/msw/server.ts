import { setupServer } from 'msw/node'
import { handlers } from './handlers'

/** The interceptor. `src/test/setup.ts` starts and stops it around every run. */
export const mswServer = setupServer(...handlers)

export {
  apiTestCustomerStore,
  apiTestSessionStore,
  apiTestStore,
  apiTestUserStore,
  forwardToApi,
  signInTestUser,
  signOutTestUser,
} from './handlers'
