import type { db as DbFn } from '../db/client'

type DB = ReturnType<typeof DbFn>

export type ThrottleResult = 'allow' | 'throttled' | 'debounced'

export async function checkThrottle(
  database: DB,
  userId: string,
  recipientId: string,
  eventKey: string,
  windowSeconds: number,
  debounceWindowSeconds: number | null,
  nowIso: string,
): Promise<ThrottleResult> {
  const nowMs = new Date(nowIso).getTime()

  const state = await database
    .selectFrom('throttle_state')
    .where('userId', '=', userId)
    .where('recipientId', '=', recipientId)
    .where('eventKey', '=', eventKey)
    .selectAll()
    .executeTakeFirst()

  if (debounceWindowSeconds != null) {
    if (!state) {
      await database
        .insertInto('throttle_state')
        .values({
          id: crypto.randomUUID(),
          userId,
          recipientId,
          eventKey,
          windowSeconds,
          lastSentAt: null,
          debounceWindowSeconds,
          pendingUntil: new Date(nowMs + debounceWindowSeconds * 1000).toISOString(),
          createdAt: nowIso,
          updatedAt: nowIso,
        })
        .execute()
      return 'debounced'
    }

    const pendingUntilMs = state.pendingUntil ? new Date(state.pendingUntil).getTime() : 0

    if (nowMs < pendingUntilMs) {
      await database
        .updateTable('throttle_state')
        .set({
          pendingUntil: new Date(nowMs + debounceWindowSeconds * 1000).toISOString(),
          debounceWindowSeconds,
          updatedAt: nowIso,
        })
        .where('id', '=', state.id)
        .execute()
      return 'debounced'
    }

    await database
      .updateTable('throttle_state')
      .set({ lastSentAt: nowIso, pendingUntil: null, debounceWindowSeconds, updatedAt: nowIso })
      .where('id', '=', state.id)
      .execute()
    return 'allow'
  }

  if (!state) {
    await database
      .insertInto('throttle_state')
      .values({
        id: crypto.randomUUID(),
        userId,
        recipientId,
        eventKey,
        windowSeconds,
        lastSentAt: nowIso,
        debounceWindowSeconds: null,
        pendingUntil: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      })
      .execute()
    return 'allow'
  }

  const lastMs = state.lastSentAt ? new Date(state.lastSentAt).getTime() : 0
  if (nowMs - lastMs < windowSeconds * 1000) {
    return 'throttled'
  }

  await database
    .updateTable('throttle_state')
    .set({ lastSentAt: nowIso, windowSeconds, updatedAt: nowIso })
    .where('id', '=', state.id)
    .execute()
  return 'allow'
}
