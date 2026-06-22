import { OpenAPIHono, z } from "@hono/zod-openapi"

import { getAdapter } from "../channels/registry"
import { resolveSendConnection } from "../channels/resolve"
import type { ChannelType } from "../channels/types"
import type { ComposePayload } from "../compose/schema"
import { Errors, validationHook } from "../lib/errors"
import { applyListQuery } from "../lib/list-query"
import { checkRateLimit } from "../lib/rate-limit"
import { renderTemplate, resolveTemplate } from "../lib/render-template"
import { resolveRoute } from "../lib/routing"
import type { AppEnv } from "../lib/types"
import { requireAuth } from "../middleware/auth"
import type { DeliveryQueueMessage } from "../queue/consumer"
import { localToUtc } from "../scheduling/utils"
import {
  DEFAULT_SORT,
  FILTERABLE,
  NotificationDtoSchema,
  SORTABLE,
  detailRoute,
  listRoute,
  sendRoute,
} from "./notifications.contract"

function newId(): string {
  return crypto.randomUUID()
}

function now(): string {
  return new Date().toISOString()
}

async function resolveRecipientAddress(
  db: ReturnType<(typeof import("../db/client"))["db"]>,
  channel: string,
  recipient: Record<string, unknown>,
  userId: string
): Promise<string> {
  if (channel === "sms" || channel === "whatsapp") {
    const account = await db
      .selectFrom("user")
      .where("id", "=", userId)
      .select("phoneNumber")
      .executeTakeFirst()
    return account?.phoneNumber ?? (recipient.phone as string | undefined) ?? ""
  }
  if (recipient.type === "contact" && recipient.email)
    return recipient.email as string
  if (recipient.type === "user" && recipient.userId) {
    const user = await db
      .selectFrom("user")
      .where("id", "=", recipient.userId as string)
      .select("email")
      .executeTakeFirst()
    return user?.email ?? ""
  }
  return ""
}

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })
router.use("*", requireAuth)

export default router
  .openapi(sendRoute, async (c) => {
    const rawPayload = c.req.valid("json")
    const { db } = c.var
    const userId = c.var.user!.id
    const ts = now()

    let resolvedTemplateId: string | null = null
    let payload: ComposePayload

    if (rawPayload.templateId || rawPayload.templateSlug) {
      const template = await resolveTemplate(db, userId, {
        templateId: rawPayload.templateId,
        templateSlug: rawPayload.templateSlug,
      })
      const renderedContent = renderTemplate(
        template,
        rawPayload.templateData ?? {},
        rawPayload.templateLocale
      )
      resolvedTemplateId = template.id
      payload = {
        ...rawPayload,
        content: renderedContent as ComposePayload["content"],
      } as ComposePayload
    } else {
      payload = rawPayload as ComposePayload
    }

    if (payload.idempotencyKey) {
      const existing = await db
        .selectFrom("idempotency_key")
        .where("userId", "=", userId)
        .where("key", "=", payload.idempotencyKey)
        .where("expiresAt", ">", ts)
        .selectAll()
        .executeTakeFirst()

      if (existing) {
        const notification = await db
          .selectFrom("notification")
          .where("id", "=", existing.notificationId)
          .where("userId", "=", userId)
          .selectAll()
          .executeTakeFirst()

        if (notification) {
          const deliveries = await db
            .selectFrom("delivery")
            .where("notificationId", "=", existing.notificationId)
            .where("userId", "=", userId)
            .selectAll()
            .execute()
          return c.json({
            ...(notification as typeof notification),
            deliveries,
          })
        }
      }
    }

    if (payload.sendAt || payload.sendAtLocal) {
      const tz = payload.timezoneHint ?? "UTC"
      const sendAtUtc = payload.sendAt
        ? new Date(payload.sendAt).toISOString()
        : localToUtc(payload.sendAtLocal!, tz).toISOString()

      if (new Date(sendAtUtc) <= new Date()) {
        throw Errors.badRequest("sendAt must be in the future")
      }

      const scheduledId = newId()
      await db
        .insertInto("scheduled_message")
        .values({
          id: scheduledId,
          userId,
          payload: JSON.stringify(payload),
          channels: JSON.stringify(payload.channels ?? ["email"]),
          sendAt: sendAtUtc,
          status: "pending",
          timezone: payload.timezoneHint ?? null,
          quietHoursStart: payload.quietHoursStart ?? null,
          quietHoursEnd: payload.quietHoursEnd ?? null,
          deliveryWindowStart: payload.deliveryWindowStart ?? null,
          deliveryWindowEnd: payload.deliveryWindowEnd ?? null,
          respectQuietHours: payload.respectQuietHours !== false ? 1 : 0,
          notificationId: null,
          recurringSendId: null,
          createdAt: ts,
          updatedAt: ts,
        })
        .execute()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return c.json(
        {
          id: scheduledId,
          sendAt: sendAtUtc,
          status: "pending" as const,
          scheduled: true as const,
        },
        202
      ) as any
    }

    let resolvedChainId: string | null = null
    let resolvedChainSteps: import("../lib/routing").ChainStep[] | null = null

    const explicitChainId = (rawPayload as { chainId?: string }).chainId
    if (explicitChainId) {
      const chain = await db
        .selectFrom("fallback_chain")
        .where("id", "=", explicitChainId)
        .where("userId", "=", userId)
        .selectAll()
        .executeTakeFirst()
      if (chain) {
        resolvedChainId = chain.id
        resolvedChainSteps = JSON.parse(
          chain.steps
        ) as import("../lib/routing").ChainStep[]
      }
    } else {
      const notificationInput = {
        priority: (payload.metadata as { priority?: string } | undefined)
          ?.priority,
      }
      const routeResult = await resolveRoute(db, userId, notificationInput)
      if (routeResult?.type === "chain") {
        resolvedChainId = routeResult.chainId
        resolvedChainSteps = routeResult.steps
      }
    }

    const channels = resolvedChainSteps
      ? [resolvedChainSteps[0]!.channel]
      : (payload.channels ?? ["email"])

    const notifId = newId()
    const subject = payload.content?.subject ?? payload.content?.title ?? null

    await db
      .insertInto("notification")
      .values({
        id: notifId,
        userId,
        payload: JSON.stringify(payload),
        subject,
        channels: JSON.stringify(channels),
        mode: "transactional",
        status: "queued",
        templateId: resolvedTemplateId,
        templateData:
          resolvedTemplateId && rawPayload.templateData
            ? JSON.stringify(rawPayload.templateData)
            : null,
        createdAt: ts,
        updatedAt: ts,
      })
      .execute()

    type DeliveryRow = {
      id: string
      userId: string
      notificationId: string
      channel: string
      recipient: string
      status: string
      providerMessageId: string | null
      error: string | null
      attempts: number
      nextRetryAt: string | null
      lastError: string | null
      deliveredAt: string | null
      openedAt: string | null
      clickedAt: string | null
      bouncedAt: string | null
      variantId: string | null
      chainId: string | null
      chainStepIndex: number | null
      escalatedFromDeliveryId: string | null
      createdAt: string
      updatedAt: string
    }

    const deliveries: DeliveryRow[] = []

    for (const channel of channels) {
      const adapter = getAdapter(channel as ChannelType)
      const dts = now()
      const deliveryId = newId()

      const recipientAddr = await resolveRecipientAddress(
        db,
        channel,
        payload.recipient as Record<string, unknown>,
        userId
      )

      const rlResult = await checkRateLimit(
        c.env.RATE_LIMIT_KV,
        db,
        userId,
        channel,
        Date.now()
      )
      if (rlResult === "exceeded") {
        await db
          .insertInto("delivery")
          .values({
            id: deliveryId,
            userId,
            notificationId: notifId,
            channel,
            recipient: recipientAddr,
            status: "skipped",
            providerMessageId: null,
            error: "rate_limit:exceeded",
            attempts: 0,
            nextRetryAt: null,
            lastError: "rate_limit:exceeded",
            deliveredAt: null,
            openedAt: null,
            clickedAt: null,
            bouncedAt: null,
            createdAt: dts,
            updatedAt: dts,
          })
          .execute()
        deliveries.push({
          id: deliveryId,
          userId,
          notificationId: notifId,
          channel,
          recipient: recipientAddr,
          status: "skipped",
          providerMessageId: null,
          error: "rate_limit:exceeded",
          attempts: 0,
          nextRetryAt: null,
          lastError: "rate_limit:exceeded",
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
        continue
      }

      if (!adapter) {
        await db
          .insertInto("delivery")
          .values({
            id: deliveryId,
            userId,
            notificationId: notifId,
            channel,
            recipient: "",
            status: "failed",
            providerMessageId: null,
            error: `No adapter registered for channel: ${channel}`,
            attempts: 1,
            nextRetryAt: null,
            lastError: `No adapter registered for channel: ${channel}`,
            deliveredAt: null,
            openedAt: null,
            clickedAt: null,
            bouncedAt: null,
            createdAt: dts,
            updatedAt: dts,
          })
          .execute()
        deliveries.push({
          id: deliveryId,
          userId,
          notificationId: notifId,
          channel,
          recipient: "",
          status: "failed",
          providerMessageId: null,
          error: `No adapter registered for channel: ${channel}`,
          attempts: 1,
          nextRetryAt: null,
          lastError: `No adapter registered for channel: ${channel}`,
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
        continue
      }

      const conn = await resolveSendConnection(
        db,
        userId,
        channel as ChannelType,
        dts
      )

      if (!conn) {
        await db
          .insertInto("delivery")
          .values({
            id: deliveryId,
            userId,
            notificationId: notifId,
            channel,
            recipient: recipientAddr,
            status: "failed",
            providerMessageId: null,
            error: `No active ${channel} connection — connect via Channels page first`,
            attempts: 1,
            nextRetryAt: null,
            lastError: `No active ${channel} connection — connect via Channels page first`,
            deliveredAt: null,
            openedAt: null,
            clickedAt: null,
            bouncedAt: null,
            createdAt: dts,
            updatedAt: dts,
          })
          .execute()
        deliveries.push({
          id: deliveryId,
          userId,
          notificationId: notifId,
          channel,
          recipient: recipientAddr,
          status: "failed",
          providerMessageId: null,
          error: `No active ${channel} connection — connect via Channels page first`,
          attempts: 1,
          nextRetryAt: null,
          lastError: `No active ${channel} connection — connect via Channels page first`,
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
        continue
      }

      await db
        .insertInto("delivery")
        .values({
          id: deliveryId,
          userId,
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
          chainId: resolvedChainId,
          chainStepIndex: resolvedChainId ? 0 : null,
          escalatedFromDeliveryId: null,
          createdAt: dts,
          updatedAt: dts,
        })
        .execute()

      const queueMsg: DeliveryQueueMessage = {
        deliveryId,
        notificationId: notifId,
        userId,
        channel,
      }
      await c.env.DELIVERY_Q.send(queueMsg)

      deliveries.push({
        id: deliveryId,
        userId,
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
        variantId: null,
        chainId: resolvedChainId,
        chainStepIndex: resolvedChainId ? 0 : null,
        escalatedFromDeliveryId: null,
        createdAt: dts,
        updatedAt: dts,
      })
    }

    if (payload.idempotencyKey) {
      const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_MS).toISOString()
      await db
        .insertInto("idempotency_key")
        .values({
          userId,
          key: payload.idempotencyKey,
          notificationId: notifId,
          expiresAt,
          createdAt: ts,
        })
        .onConflict((oc) => oc.doNothing())
        .execute()
    }

    const notification = await db
      .selectFrom("notification")
      .where("id", "=", notifId)
      .where("userId", "=", userId)
      .selectAll()
      .executeTakeFirstOrThrow()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return c.json({
      ...(notification as typeof notification),
      deliveries,
    }) as any
  })

  .openapi(listRoute, async (c) => {
    const parsed = c.req.valid("query")
    const userId = c.var.user!.id
    const baseQuery = c.var.db
      .selectFrom("notification")
      .where("userId", "=", userId)
      .selectAll()

    const { qb, getPage } = applyListQuery(baseQuery, parsed, {
      sortable: SORTABLE,
      filterable: FILTERABLE,
      defaultSort: DEFAULT_SORT,
    })

    const rows = await qb.execute()
    const page = getPage(rows as Record<string, unknown>[])

    return c.json({
      data: page.data as z.infer<typeof NotificationDtoSchema>[],
      nextCursor: page.nextCursor,
    })
  })

  .openapi(detailRoute, async (c) => {
    const { id } = c.req.param()
    const userId = c.var.user!.id

    const notification = await c.var.db
      .selectFrom("notification")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .selectAll()
      .executeTakeFirst()

    if (!notification) throw Errors.notFound("Notification")

    const deliveries = await c.var.db
      .selectFrom("delivery")
      .where("notificationId", "=", id)
      .where("userId", "=", userId)
      .selectAll()
      .execute()

    return c.json({ ...(notification as typeof notification), deliveries })
  })
