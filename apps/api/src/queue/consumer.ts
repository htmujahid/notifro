import { db } from '../db/client'
import { getAdapter } from '../channels/registry'
import { resolveSendConnection } from '../channels/resolve'
import type { ChannelType } from '../channels/types'

export interface DeliveryQueueMessage {
  deliveryId: string
  notificationId: string
  userId: string
  channel: string
}

const MAX_ATTEMPTS = 5

const RETRYABLE_FRAGMENTS = ['timeout', 'aborted', 'network', 'ETIMEDOUT', 'ECONNRESET', 'fetch failed', '429', 'rate limit', 'too many', 'service unavailable', '503', '502', '504']

function isRetryable(error?: string | null): boolean {
  if (!error) return false
  const lower = error.toLowerCase()
  return RETRYABLE_FRAGMENTS.some((f) => lower.includes(f.toLowerCase()))
}

function backoffSeconds(attempts: number): number {
  const base = Math.min(10 * Math.pow(2, attempts - 1), 3600)
  return base + Math.floor(Math.random() * base * 0.2)
}

async function moveToDeadLetter(
  database: ReturnType<typeof db>,
  delivery: { id: string; userId: string; notificationId: string; channel: string; attempts: number },
  payload: string,
  error: string,
  ts: string,
): Promise<void> {
  const id = crypto.randomUUID()
  await database
    .insertInto('dead_letter')
    .values({
      id,
      userId: delivery.userId,
      deliveryId: delivery.id,
      notificationId: delivery.notificationId,
      channel: delivery.channel,
      reason: error,
      errorCode: null,
      payload,
      error,
      attempts: delivery.attempts,
      failedAt: ts,
      createdAt: ts,
    })
    .execute()

  await database
    .updateTable('delivery')
    .set({ status: 'dead', lastError: error, updatedAt: ts })
    .where('id', '=', delivery.id)
    .execute()
}

async function updateNotificationStatus(
  database: ReturnType<typeof db>,
  notificationId: string,
  ts: string,
): Promise<void> {
  const pending = await database
    .selectFrom('delivery')
    .where('notificationId', '=', notificationId)
    .where('status', 'in', ['queued', 'retrying'])
    .select(database.fn.countAll<number>().as('n'))
    .executeTakeFirstOrThrow()

  if (Number(pending.n) > 0) return

  const failed = await database
    .selectFrom('delivery')
    .where('notificationId', '=', notificationId)
    .where('status', 'in', ['failed', 'dead'])
    .select(database.fn.countAll<number>().as('n'))
    .executeTakeFirstOrThrow()

  const finalStatus = Number(failed.n) > 0 ? 'failed' : 'completed'
  await database
    .updateTable('notification')
    .set({ status: finalStatus, updatedAt: ts })
    .where('id', '=', notificationId)
    .execute()
}

async function processDelivery(
  msg: Message<DeliveryQueueMessage>,
  env: CloudflareBindings,
): Promise<void> {
  const { deliveryId, notificationId, userId, channel } = msg.body
  const database = db(env.DB)
  const ts = new Date().toISOString()

  const delivery = await database
    .selectFrom('delivery')
    .where('id', '=', deliveryId)
    .selectAll()
    .executeTakeFirst()

  if (!delivery || delivery.status === 'delivered' || delivery.status === 'dead') {
    msg.ack()
    return
  }

  const notification = await database
    .selectFrom('notification')
    .where('id', '=', notificationId)
    .selectAll()
    .executeTakeFirst()

  if (!notification) {
    await database
      .updateTable('delivery')
      .set({ status: 'failed', lastError: 'Notification not found', updatedAt: ts })
      .where('id', '=', deliveryId)
      .execute()
    msg.ack()
    return
  }

  const adapter = getAdapter(channel as ChannelType)
  if (!adapter) {
    const payload = notification.payload
    await moveToDeadLetter(database, { ...delivery, attempts: delivery.attempts }, payload, `No adapter: ${channel}`, ts)
    msg.ack()
    return
  }

  const conn = await resolveSendConnection(database, userId, channel as ChannelType, ts)
  if (!conn) {
    const payload = notification.payload
    await moveToDeadLetter(database, { ...delivery, attempts: delivery.attempts }, payload, `No active ${channel} connection`, ts)
    await updateNotificationStatus(database, notificationId, ts)
    msg.ack()
    return
  }

  const attempts = delivery.attempts + 1
  const payload = JSON.parse(notification.payload)

  let ok = false
  let providerMessageId: string | null = null
  let sendError: string | null = null

  try {
    const provider = adapter.transform(payload, { connection: conn })
    const result = await adapter.send(provider as any, conn, { db: database, notificationId, deliveryId, env })
    ok = result.ok
    providerMessageId = result.providerMessageId ?? null
    sendError = result.ok ? null : (result.error ?? 'Send failed')
  } catch (err) {
    sendError = err instanceof Error ? err.message : String(err)
  }

  if (ok) {
    await database
      .updateTable('delivery')
      .set({ status: 'delivered', providerMessageId, attempts, lastError: null, nextRetryAt: null, deliveredAt: ts, updatedAt: ts })
      .where('id', '=', deliveryId)
      .execute()
    const deliveryRow = await database.selectFrom('delivery').where('id', '=', deliveryId).select('userId').executeTakeFirst()
    if (deliveryRow) {
      await database.insertInto('delivery_event').values({ id: crypto.randomUUID(), deliveryId, userId: deliveryRow.userId, type: 'delivered', at: ts, meta: '{}' }).execute()
    }
    await updateNotificationStatus(database, notificationId, ts)
    msg.ack()
    return
  }

  if (isRetryable(sendError) && attempts < MAX_ATTEMPTS) {
    const delay = backoffSeconds(attempts)
    await database
      .updateTable('delivery')
      .set({
        status: 'retrying',
        attempts,
        lastError: sendError,
        nextRetryAt: new Date(Date.now() + delay * 1000).toISOString(),
        updatedAt: ts,
      })
      .where('id', '=', deliveryId)
      .execute()
    msg.retry({ delaySeconds: delay })
    return
  }

  await moveToDeadLetter(database, { ...delivery, attempts }, notification.payload, sendError ?? 'Send failed', ts)
  await updateNotificationStatus(database, notificationId, ts)
  msg.ack()
}

async function processDlqMessage(
  msg: Message<DeliveryQueueMessage>,
  env: CloudflareBindings,
): Promise<void> {
  const { deliveryId, notificationId, userId, channel } = msg.body
  const database = db(env.DB)
  const ts = new Date().toISOString()

  const delivery = await database
    .selectFrom('delivery')
    .where('id', '=', deliveryId)
    .selectAll()
    .executeTakeFirst()

  if (!delivery || delivery.status === 'dead') {
    msg.ack()
    return
  }

  const notification = await database
    .selectFrom('notification')
    .where('id', '=', notificationId)
    .selectAll()
    .executeTakeFirst()

  const payload = notification?.payload ?? '{}'
  const error = delivery.lastError ?? 'Exhausted queue retries'

  const existing = await database
    .selectFrom('dead_letter')
    .where('deliveryId', '=', deliveryId)
    .select('id')
    .executeTakeFirst()

  if (!existing) {
    const id = crypto.randomUUID()
    await database
      .insertInto('dead_letter')
      .values({
        id,
        userId,
        deliveryId,
        notificationId,
        channel,
        reason: error,
        errorCode: null,
        payload,
        error,
        attempts: delivery.attempts,
        failedAt: ts,
        createdAt: ts,
      })
      .execute()
  }

  await database
    .updateTable('delivery')
    .set({ status: 'dead', lastError: error, updatedAt: ts })
    .where('id', '=', deliveryId)
    .execute()

  await updateNotificationStatus(database, notificationId, ts)
  msg.ack()
}

export async function handleDeliveryQueue(
  batch: MessageBatch<DeliveryQueueMessage>,
  env: CloudflareBindings,
): Promise<void> {
  for (const msg of batch.messages) {
    try {
      if (batch.queue === 'delivery-dlq') {
        await processDlqMessage(msg, env)
      } else {
        await processDelivery(msg, env)
      }
    } catch (err) {
      console.error('Queue consumer unhandled error:', err)
      msg.retry()
    }
  }
}
