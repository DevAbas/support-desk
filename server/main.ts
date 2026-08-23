import { serve } from '@hono/node-server'
import { createApiApp } from './app'
import type { Role } from '../src/lib/types'

/**
 * The node entry point. Everything environment-specific lives here so that
 * `app.ts` stays a plain request handler the test suite can drive in-process.
 */

const port = Number(process.env.PORT ?? 8787)

/** `API_FAIL=1 npm run dev` makes every request fail, for error-state work. */
const failAlways = process.env.API_FAIL === '1'

const role: Role = process.env.API_ROLE === 'admin' ? 'admin' : 'agent'

const latency = process.env.API_LATENCY_MS
const latencyMs = latency === undefined ? undefined : ([0, Number(latency)] as const)

if (latencyMs && !Number.isFinite(latencyMs[1])) {
  throw new Error(`API_LATENCY_MS must be a number, got "${latency}".`)
}

serve({ fetch: createApiApp({ failAlways, role, latencyMs }).fetch, port }, (info) => {
  console.log(`API listening on http://localhost:${info.port}`)
})
