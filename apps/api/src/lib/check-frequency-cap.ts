import { sql } from 'kysely'
import type { db as DbFn } from '../db/client'

type DB = ReturnType<typeof DbFn>

export type CapResult =
  | { action: 'allow' }
  | { action: 'drop' }
  | { action: 'defer'; deferUntil: string }
  | { action: 'digest'; digestKey: string; schedule: string; templateId: string | null }

export async function checkFrequencyCap(
  database: DB,
  userId: string,
  recipientId: string,
  channel: string,
  nowIso: string,
  topicId?: string | null,
): Promise<CapResult> {
  const caps = await database
    .selectFrom('frequency_cap')
    .where('userId', '=', userId)
    .where((eb) => eb.or([eb('channel', '=', channel), eb('channel', '=', '*')]))
    .where((eb) =>
      eb.or([
        eb('topicId', 'is', null),
        ...(topicId ? [eb('topicId', '=', topicId)] : []),
      ]),
    )
    .selectAll()
    .execute()

  if (caps.length === 0) return { action: 'allow' }

  const cap =
    caps.find((c) => c.channel === channel && (topicId ? c.topicId === topicId : c.topicId == null)) ??
    caps.find((c) => c.channel === channel) ??
    caps[0]

  const nowMs = new Date(nowIso).getTime()
  const windowStartMs = Math.floor(nowMs / 1000 / cap.windowSeconds) * cap.windowSeconds * 1000
  const windowStart = new Date(windowStartMs).toISOString()

  const existing = await database
    .selectFrom('delivery_counter')
    .where('userId', '=', userId)
    .where('recipientId', '=', recipientId)
    .where('channel', '=', channel)
    .where('windowStart', '=', windowStart)
    .select('count')
    .executeTakeFirst()

  if ((existing?.count ?? 0) >= cap.maxCount) {
    if (cap.overflowPolicy === 'defer') {
      const windowEndMs = windowStartMs + cap.windowSeconds * 1000
      return { action: 'defer', deferUntil: new Date(windowEndMs).toISOString() }
    }
    if (cap.overflowPolicy === 'digest' && cap.digestKey) {
      return {
        action: 'digest',
        digestKey: cap.digestKey,
        schedule: cap.digestSchedule ?? 'daily',
        templateId: cap.digestTemplateId ?? null,
      }
    }
    return { action: 'drop' }
  }

  const counterId = crypto.randomUUID()
  await sql`
    INSERT INTO "delivery_counter" ("id", "userId", "recipientId", "channel", "windowStart", "count")
    VALUES (${counterId}, ${userId}, ${recipientId}, ${channel}, ${windowStart}, 1)
    ON CONFLICT("userId", "recipientId", "channel", "windowStart")
    DO UPDATE SET "count" = "delivery_counter"."count" + 1
  `.execute(database)

  return { action: 'allow' }
}
