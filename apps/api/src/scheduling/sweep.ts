import { getAdapter } from "../channels/registry"
import { resolveSendConnection } from "../channels/resolve"
import type { ChannelType } from "../channels/types"
import { db } from "../db/client"
import type { DeliveryQueueMessage } from "../queue/consumer"
import { nextCronRun } from "./cron"
import {
  isInDeliveryWindow,
  isInQuietHours,
  nextAllowedTime,
  nextWindowStart,
} from "./utils"

export async function handleScheduledSweep(
  env: CloudflareBindings
): Promise<void> {
  const database = db(env.DB)
  const now = new Date()
  const ts = now.toISOString()

  const due = await database
    .selectFrom("scheduled_message")
    .where("status", "=", "pending")
    .where("sendAt", "<=", ts)
    .selectAll()
    .orderBy("sendAt", "asc")
    .limit(100)
    .execute()

  for (const msg of due) {
    const tz = msg.timezone ?? "UTC"
    const payload = JSON.parse(msg.payload) as Record<string, unknown>
    const priority = (payload.metadata as Record<string, unknown> | undefined)
      ?.priority

    const shouldRespectQH =
      msg.respectQuietHours === 1 &&
      priority !== "urgent" &&
      priority !== "high"

    const effectiveQHStart = msg.quietHoursStart
    const effectiveQHEnd = msg.quietHoursEnd

    if (shouldRespectQH && effectiveQHStart && effectiveQHEnd) {
      if (isInQuietHours(now, effectiveQHStart, effectiveQHEnd, tz)) {
        const next = nextAllowedTime(now, effectiveQHEnd, tz)
        await database
          .updateTable("scheduled_message")
          .set({ sendAt: next.toISOString(), updatedAt: ts })
          .where("id", "=", msg.id)
          .execute()
        continue
      }
    }

    if (msg.deliveryWindowStart && msg.deliveryWindowEnd) {
      if (
        !isInDeliveryWindow(
          now,
          msg.deliveryWindowStart,
          msg.deliveryWindowEnd,
          tz
        )
      ) {
        const next = nextWindowStart(now, msg.deliveryWindowStart, tz)
        await database
          .updateTable("scheduled_message")
          .set({ sendAt: next.toISOString(), updatedAt: ts })
          .where("id", "=", msg.id)
          .execute()
        continue
      }
    }

    const channels = JSON.parse(msg.channels) as ChannelType[]
    const notifId = crypto.randomUUID()
    const dts = new Date().toISOString()

    await database
      .insertInto("notification")
      .values({
        id: notifId,
        userId: msg.userId,
        payload: msg.payload,
        subject:
          ((payload.content as Record<string, unknown> | undefined)
            ?.subject as string) ??
          ((payload.content as Record<string, unknown> | undefined)
            ?.title as string) ??
          null,
        channels: msg.channels,
        mode: "transactional",
        status: "queued",
        createdAt: dts,
        updatedAt: dts,
      })
      .execute()

    for (const channel of channels) {
      const deliveryId = crypto.randomUUID()
      const dts2 = new Date().toISOString()
      const adapter = getAdapter(channel)

      if (!adapter) {
        await database
          .insertInto("delivery")
          .values({
            id: deliveryId,
            userId: msg.userId,
            notificationId: notifId,
            channel,
            recipient: "",
            status: "failed",
            providerMessageId: null,
            error: `No adapter: ${channel}`,
            attempts: 1,
            nextRetryAt: null,
            lastError: `No adapter: ${channel}`,
            deliveredAt: null,
            openedAt: null,
            clickedAt: null,
            bouncedAt: null,
            createdAt: dts2,
            updatedAt: dts2,
          })
          .execute()
        continue
      }

      const conn = await resolveSendConnection(
        database,
        msg.userId,
        channel,
        dts2
      )
      const recipient = payload.recipient as Record<string, unknown> | undefined
      let recipientAddr = ""
      if (recipient?.type === "contact" && recipient.email)
        recipientAddr = recipient.email as string

      if (!conn) {
        await database
          .insertInto("delivery")
          .values({
            id: deliveryId,
            userId: msg.userId,
            notificationId: notifId,
            channel,
            recipient: recipientAddr,
            status: "failed",
            providerMessageId: null,
            error: `No active ${channel} connection`,
            attempts: 1,
            nextRetryAt: null,
            lastError: `No active ${channel} connection`,
            deliveredAt: null,
            openedAt: null,
            clickedAt: null,
            bouncedAt: null,
            createdAt: dts2,
            updatedAt: dts2,
          })
          .execute()
        continue
      }

      await database
        .insertInto("delivery")
        .values({
          id: deliveryId,
          userId: msg.userId,
          notificationId: notifId,
          channel,
          recipient: recipientAddr,
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
          createdAt: dts2,
          updatedAt: dts2,
        })
        .execute()

      const queueMsg: DeliveryQueueMessage = {
        deliveryId,
        notificationId: notifId,
        userId: msg.userId,
        channel,
      }
      await env.DELIVERY_Q.send(queueMsg)
    }

    await database
      .updateTable("scheduled_message")
      .set({ status: "enqueued", notificationId: notifId, updatedAt: dts })
      .where("id", "=", msg.id)
      .execute()
  }

  const dueRecurring = await database
    .selectFrom("recurring_send")
    .where("enabled", "=", 1)
    .where("nextRunAt", "<=", ts)
    .selectAll()
    .orderBy("nextRunAt", "asc")
    .limit(50)
    .execute()

  for (const recurring of dueRecurring) {
    const runAt = recurring.nextRunAt
    const scheduledId = crypto.randomUUID()
    const rdts = new Date().toISOString()

    await database
      .insertInto("scheduled_message")
      .values({
        id: scheduledId,
        userId: recurring.userId,
        payload: recurring.payload,
        channels: recurring.channels,
        sendAt: runAt,
        status: "pending",
        timezone: recurring.timezone,
        quietHoursStart: null,
        quietHoursEnd: null,
        deliveryWindowStart: null,
        deliveryWindowEnd: null,
        respectQuietHours: 1,
        notificationId: null,
        recurringSendId: recurring.id,
        createdAt: rdts,
        updatedAt: rdts,
      })
      .execute()

    let nextRunAt: string
    try {
      nextRunAt = nextCronRun(
        recurring.cron,
        new Date(runAt),
        recurring.timezone
      ).toISOString()
    } catch {
      await database
        .updateTable("recurring_send")
        .set({ enabled: 0, lastRunAt: runAt, updatedAt: rdts })
        .where("id", "=", recurring.id)
        .execute()
      continue
    }

    await database
      .updateTable("recurring_send")
      .set({ nextRunAt, lastRunAt: runAt, updatedAt: rdts })
      .where("id", "=", recurring.id)
      .execute()
  }
}
