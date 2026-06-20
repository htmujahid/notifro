import { createAuthClient } from "better-auth/client"
import { twoFactorClient } from "better-auth/client/plugins"
import type { BetterAuthClientOptions } from "better-auth/client"

export type { BetterAuthClientOptions }

export function createBaseAuthClient(
  baseURL: string,
  options?: Omit<BetterAuthClientOptions, "baseURL">,
) {
  return createAuthClient({
    baseURL,
    ...options,
    plugins: [twoFactorClient()],
  })
}

export type AuthClient = ReturnType<typeof createBaseAuthClient>
