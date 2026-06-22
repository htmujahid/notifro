import { sql } from "kysely"

import { getAdapter } from "../channels/registry"
import { resolveSendConnection } from "../channels/resolve"
import type { ChannelType, Connection } from "../channels/types"
import { db } from "../db/client"
import { redactPii } from "../lib/redact"
import { escalateChain } from "../lib/routing"

export interface DeliveryQueueMessage {
  deliveryId: string
  notificationId: string
  userId: string
  channel: string
  escalationCheck?: boolean
  connectionId?: string
}

const MAX_ATTEMPTS = 5

const RETRYABLE_FRAGMENTS = [
  "timeout",
  "aborted",
  "network",
  "ETIMEDOUT",
  "ECONNRESET",
  "fetch failed",
  "429",
  "rate limit",
  "too many",
  "service unavailable",
  "503",
  "502",
  "504",
]

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
  delivery: {
    id: string
    userId: string
    notificationId: string
    channel: string
    attempts: number
  },
  payload: string,
  error: string,
  ts: string
): Promise<void> {
  const id = crypto.randomUUID()
  await database
    .insertInto("dead_letter")
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
    .updateTable("delivery")
    .set({ status: "dead", lastError: error, updatedAt: ts })
    .where("id", "=", delivery.id)
    .execute()
}

async function updateNotificationStatus(
  database: ReturnType<typeof db>,
  notificationId: string,
  ts: string
): Promise<void> {
  const counts = await database
    .selectFrom("delivery")
    .where("notificationId", "=", notificationId)
    .select([
      sql<number>`SUM(CASE WHEN status IN ('queued','retrying') THEN 1 ELSE 0 END)`.as(
        "pending"
      ),
      sql<number>`SUM(CASE WHEN status IN ('failed','dead') THEN 1 ELSE 0 END)`.as(
        "failed"
      ),
    ])
    .executeTakeFirstOrThrow()

  if (Number(counts.pending) > 0) return

  const finalStatus = Number(counts.failed) > 0 ? "failed" : "completed"
  await database
    .updateTable("notification")
    .set({ status: finalStatus, updatedAt: ts })
    .where("id", "=", notificationId)
    .execute()
}

async function processDelivery(
  msg: Message<DeliveryQueueMessage>,
  env: CloudflareBindings
): Promise<void> {
  const {
    deliveryId,
    notificationId,
    userId,
    channel,
    escalationCheck,
    connectionId,
  } = msg.body
  const database = db(env.DB)
  const ts = new Date().toISOString()

  const delivery = await database
    .selectFrom("delivery")
    .where("id", "=", deliveryId)
    .selectAll()
    .executeTakeFirst()

  if (!delivery) {
    msg.ack()
    return
  }

  if (escalationCheck) {
    if (delivery.chainId && delivery.chainStepIndex !== null) {
      const chain = await database
        .selectFrom("fallback_chain")
        .where("id", "=", delivery.chainId)
        .selectAll()
        .executeTakeFirst()
      if (chain) {
        const steps = JSON.parse(
          chain.steps
        ) as import("../lib/routing").ChainStep[]
        const step = steps[delivery.chainStepIndex]
        if (step) {
          const successOnSet = new Set(step.successOn)
          const succeeded =
            (successOnSet.has("delivered") && delivery.deliveredAt !== null) ||
            (successOnSet.has("opened") && delivery.openedAt !== null) ||
            (successOnSet.has("clicked") && delivery.clickedAt !== null)
          if (!succeeded) {
            await escalateChain(
              database,
              env,
              deliveryId,
              notificationId,
              userId,
              delivery.chainId,
              delivery.chainStepIndex,
              ts
            )
          }
        }
      }
    }
    msg.ack()
    return
  }

  if (delivery.status === "delivered" || delivery.status === "dead") {
    msg.ack()
    return
  }

  const notification = await database
    .selectFrom("notification")
    .where("id", "=", notificationId)
    .selectAll()
    .executeTakeFirst()

  if (!notification) {
    await database
      .updateTable("delivery")
      .set({
        status: "failed",
        lastError: "Notification not found",
        updatedAt: ts,
      })
      .where("id", "=", deliveryId)
      .execute()
    msg.ack()
    return
  }

  const adapter = getAdapter(channel as ChannelType)
  if (!adapter) {
    const payload = notification.payload
    await moveToDeadLetter(
      database,
      { ...delivery, attempts: delivery.attempts },
      payload,
      `No adapter: ${channel}`,
      ts
    )
    msg.ack()
    return
  }

  let conn = connectionId
    ? (((await database
        .selectFrom("connection")
        .where("id", "=", connectionId)
        .where("userId", "=", userId)
        .selectAll()
        .executeTakeFirst()) ?? null) as Connection | null)
    : await resolveSendConnection(database, userId, channel as ChannelType, ts)
  if (!conn) {
    const payload = notification.payload
    await moveToDeadLetter(
      database,
      { ...delivery, attempts: delivery.attempts },
      payload,
      `No active ${channel} connection`,
      ts
    )
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
    const result = await adapter.send(provider as any, conn, {
      db: database,
      notificationId,
      deliveryId,
      env,
    })
    ok = result.ok
    providerMessageId = result.providerMessageId ?? null
    sendError = result.ok ? null : (result.error ?? "Send failed")
  } catch (err) {
    sendError = err instanceof Error ? err.message : String(err)
  }

  if (sendError) sendError = redactPii(sendError)

  if (ok) {
    await database
      .updateTable("delivery")
      .set({
        status: "delivered",
        providerMessageId,
        attempts,
        lastError: null,
        nextRetryAt: null,
        deliveredAt: ts,
        updatedAt: ts,
      })
      .where("id", "=", deliveryId)
      .execute()
    // `delivery` (fetched above) already holds userId/chainId/chainStepIndex,
    // those don't change on the status update, so no need to re-SELECT it.
    await database
      .insertInto("delivery_event")
      .values({
        id: crypto.randomUUID(),
        deliveryId,
        userId: delivery.userId,
        type: "delivered",
        at: ts,
        meta: "{}",
      })
      .execute()

    if (delivery.chainId && delivery.chainStepIndex !== null) {
      const chain = await database
        .selectFrom("fallback_chain")
        .where("id", "=", delivery.chainId)
        .selectAll()
        .executeTakeFirst()
      if (chain) {
        const steps = JSON.parse(
          chain.steps
        ) as import("../lib/routing").ChainStep[]
        const step = steps[delivery.chainStepIndex]
        if (step) {
          const successOnSet = new Set(step.successOn)
          if (!successOnSet.has("delivered") && step.waitForDeliveryMs > 0) {
            const delaySeconds = Math.ceil(step.waitForDeliveryMs / 1000)
            await env.DELIVERY_Q.send(
              {
                deliveryId,
                notificationId,
                userId,
                channel,
                escalationCheck: true,
              },
              { delaySeconds }
            )
          }
        }
      }
    }
    await updateNotificationStatus(database, notificationId, ts)
    msg.ack()
    return
  }

  if (isRetryable(sendError) && attempts < MAX_ATTEMPTS) {
    const delay = backoffSeconds(attempts)
    await database
      .updateTable("delivery")
      .set({
        status: "retrying",
        attempts,
        lastError: sendError,
        nextRetryAt: new Date(Date.now() + delay * 1000).toISOString(),
        updatedAt: ts,
      })
      .where("id", "=", deliveryId)
      .execute()
    msg.retry({ delaySeconds: delay })
    return
  }

  if (!isRetryable(sendError) && !connectionId) {
    const fallback = await database
      .selectFrom("provider_fallback")
      .where("userId", "=", userId)
      .where("channel", "=", channel)
      .selectAll()
      .executeTakeFirst()
    if (fallback) {
      const fbDeliveryId = crypto.randomUUID()
      const dts = new Date().toISOString()
      await database
        .insertInto("delivery")
        .values({
          id: fbDeliveryId,
          userId,
          notificationId,
          channel,
          recipient: delivery.recipient,
          status: "queued",
          providerMessageId: null,
          error: null,
          attempts: 0,
          nextRetryAt: null,
          lastError: null,
          deliveredAt: null,
          openedAt: null,
          clickedAt: null,
          bouncedAt: null,
          variantId: null,
          chainId: null,
          chainStepIndex: null,
          escalatedFromDeliveryId: null,
          createdAt: dts,
          updatedAt: dts,
        })
        .execute()
      await env.DELIVERY_Q.send({
        deliveryId: fbDeliveryId,
        notificationId,
        userId,
        channel,
        connectionId: fallback.fallbackConnectionId,
      })
    }
  }

  await moveToDeadLetter(
    database,
    { ...delivery, attempts },
    notification.payload,
    sendError ?? "Send failed",
    ts
  )

  if (delivery.chainId && delivery.chainStepIndex !== null) {
    await escalateChain(
      database,
      env,
      deliveryId,
      notificationId,
      userId,
      delivery.chainId,
      delivery.chainStepIndex,
      ts
    )
  }

  await updateNotificationStatus(database, notificationId, ts)
  msg.ack()
}

async function processDlqMessage(
  msg: Message<DeliveryQueueMessage>,
  env: CloudflareBindings
): Promise<void> {
  const { deliveryId, notificationId, userId, channel } = msg.body
  const database = db(env.DB)
  const ts = new Date().toISOString()

  const delivery = await database
    .selectFrom("delivery")
    .where("id", "=", deliveryId)
    .selectAll()
    .executeTakeFirst()

  if (!delivery || delivery.status === "dead") {
    msg.ack()
    return
  }

  const notification = await database
    .selectFrom("notification")
    .where("id", "=", notificationId)
    .selectAll()
    .executeTakeFirst()

  const payload = notification?.payload ?? "{}"
  const error = delivery.lastError ?? "Exhausted queue retries"

  const existing = await database
    .selectFrom("dead_letter")
    .where("deliveryId", "=", deliveryId)
    .select("id")
    .executeTakeFirst()

  if (!existing) {
    const id = crypto.randomUUID()
    await database
      .insertInto("dead_letter")
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
    .updateTable("delivery")
    .set({ status: "dead", lastError: error, updatedAt: ts })
    .where("id", "=", deliveryId)
    .execute()

  await updateNotificationStatus(database, notificationId, ts)
  msg.ack()
}

export async function handleDeliveryQueue(
  batch: MessageBatch<DeliveryQueueMessage>,
  env: CloudflareBindings
): Promise<void> {
  for (const msg of batch.messages) {
    try {
      if (batch.queue === "delivery-dlq") {
        await processDlqMessage(msg, env)
      } else {
        await processDelivery(msg, env)
      }
    } catch (err) {
      console.error("Queue consumer unhandled error:", err)
      msg.retry()
    }
  }
}
