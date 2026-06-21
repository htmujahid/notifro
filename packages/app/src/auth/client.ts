import { createAuthClient } from "better-auth/client"
import type { BetterAuthClientOptions } from "better-auth/client"
import { phoneNumberClient, twoFactorClient } from "better-auth/client/plugins"

export type { BetterAuthClientOptions }

export function createBaseAuthClient(
  baseURL: string,
  options?: Omit<BetterAuthClientOptions, "baseURL">
) {
  return createAuthClient({
    baseURL,
    ...options,
    plugins: [twoFactorClient(), phoneNumberClient()],
  })
}

export type AuthClient = ReturnType<typeof createBaseAuthClient>
