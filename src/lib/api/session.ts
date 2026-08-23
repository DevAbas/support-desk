import { meResponseSchema, type MeResponse } from './contract'
import { apiRequest } from './http'

/**
 * There is no authentication in this app. `GET /api/me` reports the role the
 * server was started with, and the Settings page overrides it locally — see
 * `RoleProvider`.
 */
export function getMe(signal?: AbortSignal): Promise<MeResponse> {
  return apiRequest('/me', { schema: meResponseSchema, signal })
}
