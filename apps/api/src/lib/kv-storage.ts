import type { betterAuth } from 'better-auth'

// better-auth's `secondaryStorage` shape. Inferred from the option so we stay in
// sync with the installed version without importing an unexported type.
type SecondaryStorage = NonNullable<Parameters<typeof betterAuth>[0]['secondaryStorage']>

// Cloudflare KV rejects an `expirationTtl` below 60 seconds. better-auth uses
// short TTLs for rate-limit windows, so clamp anything smaller to the floor.
const KV_MIN_TTL_SECONDS = 60

/**
 * Backs better-auth with a Cloudflare KV namespace. Used for two things:
 *  - sessions (read on every request, so KV's edge caching keeps it fast and
 *    off the D1 hot path)
 *  - rate limiting (see `rateLimit.storage: 'secondary-storage'` in auth.ts)
 *
 * Note: KV is eventually consistent, so rate-limit counters can briefly
 * undercount across regions — acceptable for abuse throttling, not for hard
 * quotas.
 */
export function kvSecondaryStorage(kv: KVNamespace): SecondaryStorage {
  return {
    get: async (key) => {
      return await kv.get(key)
    },
    set: async (key, value, ttl) => {
      if (ttl) {
        await kv.put(key, value, { expirationTtl: Math.max(ttl, KV_MIN_TTL_SECONDS) })
      } else {
        await kv.put(key, value)
      }
    },
    delete: async (key) => {
      await kv.delete(key)
    },
  }
}
