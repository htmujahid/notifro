import type { AppDB } from '../db/client'
import { localToUtc } from './utils'

const MIN_EVENTS = 5
const DEFAULT_HOUR = 9

function getLocalHour(date: Date, tz: string): number {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', hour12: false })
  const parts = f.formatToParts(date)
  let h = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10)
  if (h === 24) h = 0
  return h
}

export async function computeBestHour(db: AppDB, userId: string): Promise<{ bestHourLocal: number; confidence: number }> {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const events = await db
    .selectFrom('delivery_event')
    .where('userId', '=', userId)
    .where('type', 'in', ['opened', 'clicked'])
    .where('at', '>=', since)
    .select(['at'])
    .execute()

  if (events.length < MIN_EVENTS) return { bestHourLocal: DEFAULT_HOUR, confidence: 0 }

  const tzRow = await db
    .selectFrom('recipient_profile')
    .where('userId', '=', userId)
    .select(['timezone'])
    .executeTakeFirst()
  const tz = tzRow?.timezone ?? 'UTC'

  const hourCounts = new Array<number>(24).fill(0)
  for (const event of events) {
    hourCounts[getLocalHour(new Date(event.at), tz)]++
  }

  let bestHourLocal = DEFAULT_HOUR
  let maxCount = 0
  for (let h = 0; h < 24; h++) {
    if (hourCounts[h] > maxCount) {
      maxCount = hourCounts[h]
      bestHourLocal = h
    }
  }

  return { bestHourLocal, confidence: Math.min(1.0, events.length / 50) }
}

export async function getStoSendAt(db: AppDB, userId: string, nowDate: Date): Promise<Date> {
  const stoRow = await db
    .selectFrom('recipient_send_time')
    .where('userId', '=', userId)
    .select(['bestHourLocal', 'confidence'])
    .executeTakeFirst()

  const tzRow = await db
    .selectFrom('recipient_profile')
    .where('userId', '=', userId)
    .select(['timezone'])
    .executeTakeFirst()
  const tz = tzRow?.timezone ?? 'UTC'

  const bestHour = stoRow && stoRow.confidence > 0 ? stoRow.bestHourLocal : DEFAULT_HOUR

  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour12: false,
  })
  const parts = f.formatToParts(nowDate)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  const datePart = `${get('year')}-${get('month')}-${get('day')}`

  let targetUtc = localToUtc(`${datePart}T${String(bestHour).padStart(2, '0')}:00:00`, tz)
  if (targetUtc.getTime() <= nowDate.getTime()) {
    const nextDay = new Date(nowDate.getTime() + 24 * 60 * 60 * 1000)
    const p2 = f.formatToParts(nextDay)
    const g2 = (t: string) => p2.find((p) => p.type === t)?.value ?? ''
    const nextDate = `${g2('year')}-${g2('month')}-${g2('day')}`
    targetUtc = localToUtc(`${nextDate}T${String(bestHour).padStart(2, '0')}:00:00`, tz)
  }
  return targetUtc
}

export async function recomputeAllStoProfiles(db: AppDB): Promise<void> {
  const users = await db
    .selectFrom('delivery_event')
    .select('userId')
    .distinct()
    .execute()

  const ts = new Date().toISOString()
  for (const { userId } of users) {
    const { bestHourLocal, confidence } = await computeBestHour(db, userId)
    await db
      .insertInto('recipient_send_time')
      .values({ userId, bestHourLocal, confidence, computedAt: ts })
      .onConflict((oc) => oc.column('userId').doUpdateSet({ bestHourLocal, confidence, computedAt: ts }))
      .execute()
  }
}
