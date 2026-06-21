import type { AppDB } from "../db/client"

export async function checkRateLimit(
  kv: KVNamespace,
  db: AppDB,
  userId: string,
  channel: string,
  nowMs: number
): Promise<"allow" | "exceeded"> {
  const rule = await db
    .selectFrom("rate_limit_rule")
    .where("userId", "=", userId)
    .where("channel", "=", channel)
    .selectAll()
    .executeTakeFirst()

  if (!rule) return "allow"

  const windowId = Math.floor(nowMs / 1000 / rule.windowSeconds)
  const key = `rl:${userId}:${channel}:${windowId}`

  const val = await kv.get(key)
  const count = val ? parseInt(val, 10) : 0

  if (count >= rule.maxCount) return "exceeded"

  await kv.put(key, String(count + 1), {
    expirationTtl: rule.windowSeconds * 2,
  })

  return "allow"
}
