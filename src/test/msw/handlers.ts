import { http, type HttpResponseResolver } from 'msw'
import { createApiApp } from '../../../server/app'
import { createTicketStore } from '../../../server/store'

/**
 * MSW intercepts the request and hands it to the real API.
 *
 * The alternative — handlers that return fixtures — would mean the tests agreed
 * with a second, hand-written implementation of the queue rather than with the
 * one the app talks to. Forwarding to `app.fetch` means a test exercises the
 * real query layer against the real routing, validation and paging, and a
 * contract broken on either side fails here.
 *
 * The latency the server adds in development is turned off: it is there to make
 * loading states real, and a test that waits for it is only slower.
 */

export const apiTestStore = createTicketStore()

const app = createApiApp({ store: apiTestStore, latencyMs: [0, 0] })

/** Exported so a one-off handler can inspect a request and still answer it. */
export async function forwardToApi(request: Request): Promise<Response> {
  return await app.fetch(request)
}

const forward: HttpResponseResolver = ({ request }) => forwardToApi(request)

export const handlers = [
  http.get('/api/me', forward),
  http.get('/api/tickets', forward),
  http.post('/api/tickets', forward),
  http.patch('/api/tickets/bulk', forward),
  http.delete('/api/tickets/bulk', forward),
  http.get('/api/tickets/:id', forward),
  http.patch('/api/tickets/:id', forward),
  http.delete('/api/tickets/:id', forward),
  http.post('/api/tickets/:id/comments', forward),
]
