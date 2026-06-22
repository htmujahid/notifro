import type { betterAuth } from "better-auth"

type SecondaryStorage = NonNullable<
  Parameters<typeof betterAuth>[0]["secondaryStorage"]
>

const KV_MIN_TTL_SECONDS = 60

export function kvSecondaryStorage(kv: KVNamespace): SecondaryStorage {
  return {
    get: async (key) => {
      return await kv.get(key)
    },
    set: async (key, value, ttl) => {
      if (ttl) {
        await kv.put(key, value, {
          expirationTtl: Math.max(ttl, KV_MIN_TTL_SECONDS),
        })
      } else {
        await kv.put(key, value)
      }
    },
    delete: async (key) => {
      await kv.delete(key)
    },
  }
}
