import type { db as DbFn } from '../db/client'
import type { DeliveryQueueMessage } from '../queue/consumer'

type DB = ReturnType<typeof DbFn>

function computeNextFlushAt(schedule: string, nowMs: number): string {
  if (schedule === 'hourly') {
    return new Date(Math.ceil(nowMs / 3_600_000) * 3_600_000).toISOString()
  }
  if (schedule === 'weekly') {
    const d = new Date(nowMs)
    const dayOfWeek = d.getUTCDay()
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
    d.setUTCDate(d.getUTCDate() + daysUntilMonday)
    d.setUTCHours(0, 0, 0, 0)
    return d.toISOString()
  }
  const d = new Date(nowMs)
  d.setUTCDate(d.getUTCDate() + 1)
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

export async function addToDigest(
  database: DB,
  userId: string,
  recipientId: string,
  channel: string,
  digestKey: string,
  schedule: string,
  templateId: string | null,
  notificationId: string,
  payload: string,
  nowIso: string,
): Promise<void> {
  const nowMs = new Date(nowIso).getTime()

  let bucket = await database
    .selectFrom('digest_bucket')
    .where('userId', '=', userId)
    .where('recipientId', '=', recipientId)
    .where('channel', '=', channel)
    .where('digestKey', '=', digestKey)
    .where('status', '=', 'open')
    .select('id')
    .executeTakeFirst()

  if (!bucket) {
    const bucketId = crypto.randomUUID()
    await database
      .insertInto('digest_bucket')
      .values({
        id: bucketId,
        userId,
        recipientId,
        channel,
        digestKey,
        schedule,
        templateId,
        status: 'open',
        nextFlushAt: computeNextFlushAt(schedule, nowMs),
        createdAt: nowIso,
        updatedAt: nowIso,
      })
      .execute()
    bucket = { id: bucketId }
  }

  await database
    .insertInto('digest_item')
    .values({
      id: crypto.randomUUID(),
      bucketId: bucket.id,
      notificationId,
      payload,
      createdAt: nowIso,
    })
    .execute()
}

export async function flushDueDigests(
  database: DB,
  env: CloudflareBindings,
  nowIso: string,
): Promise<void> {
  const dueBuckets = await database
    .selectFrom('digest_bucket')
    .where('status', '=', 'open')
    .where('nextFlushAt', '<=', nowIso)
    .selectAll()
    .limit(50)
    .execute()

  for (const bucket of dueBuckets) {
    await database
      .updateTable('digest_bucket')
      .set({ status: 'flushing', updatedAt: nowIso })
      .where('id', '=', bucket.id)
      .where('status', '=', 'open')
      .execute()

    const items = await database
      .selectFrom('digest_item')
      .where('bucketId', '=', bucket.id)
      .selectAll()
      .execute()

    if (items.length === 0) {
      await database
        .updateTable('digest_bucket')
        .set({ status: 'sent', updatedAt: nowIso })
        .where('id', '=', bucket.id)
        .execute()
      continue
    }

    const recipientRow = await database
      .selectFrom('recipient')
      .where('id', '=', bucket.recipientId)
      .select(['email', 'phone'])
      .executeTakeFirst()

    const recipientAddr = recipientRow?.email ?? recipientRow?.phone ?? ''

    const itemSummaries = items.map((item, idx) => {
      const p = JSON.parse(item.payload) as Record<string, unknown>
      const content = p.content as Record<string, unknown> | undefined
      const title = (content?.title ?? content?.subject ?? 'Notification') as string
      return `${idx + 1}. ${title}`
    })

    const digestPayload = JSON.stringify({
      schemaVersion: '1',
      content: {
        title: `Digest: ${items.length} notification${items.length !== 1 ? 's' : ''}`,
        body: { text: itemSummaries.join('\n') },
      },
      metadata: { priority: 'normal' },
      recipient: recipientRow?.email
        ? { type: 'contact', email: recipientRow.email }
        : { type: 'contact', phone: recipientRow?.phone ?? '' },
    })

    const notifId = crypto.randomUUID()
    const deliveryId = crypto.randomUUID()

    await database
      .insertInto('notification')
      .values({
        id: notifId,
        userId: bucket.userId,
        payload: digestPayload,
        subject: `Digest: ${items.length} notification${items.length !== 1 ? 's' : ''}`,
        channels: JSON.stringify([bucket.channel]),
        mode: 'transactional',
        status: 'queued',
        templateId: bucket.templateId ?? null,
        templateData: bucket.templateId
          ? JSON.stringify({ items: items.map((i) => JSON.parse(i.payload)) })
          : null,
        createdAt: nowIso,
        updatedAt: nowIso,
      })
      .execute()

    await database
      .insertInto('delivery')
      .values({
        id: deliveryId,
        userId: bucket.userId,
        notificationId: notifId,
        channel: bucket.channel,
        recipient: recipientAddr,
        status: 'queued',
        providerMessageId: null,
        error: null,
        attempts: 0,
        nextRetryAt: null,
        lastError: null,
        deliveredAt: null,
        openedAt: null,
        clickedAt: null,
        bouncedAt: null,
        recipientId: bucket.recipientId,
        variantId: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      })
      .execute()

    const queueMsg: DeliveryQueueMessage = {
      deliveryId,
      notificationId: notifId,
      userId: bucket.userId,
      channel: bucket.channel,
    }
    await env.DELIVERY_Q.send(queueMsg)

    await database
      .updateTable('digest_bucket')
      .set({ status: 'sent', updatedAt: nowIso })
      .where('id', '=', bucket.id)
      .execute()
  }
}
