import { createAuthClient } from "better-auth/client"
import type { BetterAuthClientOptions } from "better-auth/client"

export type { BetterAuthClientOptions }
export type AuthClient = ReturnType<typeof createAuthClient>

export function createBaseAuthClient(
  baseURL: string,
  options?: Omit<BetterAuthClientOptions, "baseURL">,
): AuthClient {
  return createAuthClient({ baseURL, ...options })
}
