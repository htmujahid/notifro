import { OpenAPIHono, z } from "@hono/zod-openapi"

import { Errors, validationHook } from "../lib/errors"
import { applyListQuery } from "../lib/list-query"
import type { AppEnv } from "../lib/types"
import { requireAuth } from "../middleware/auth"
import type { DeliveryQueueMessage } from "../queue/consumer"
import {
  DEFAULT_SORT,
  DELIVERY_DEFAULT_SORT,
  DELIVERY_FILTERABLE,
  DELIVERY_SORTABLE,
  DeadLetterDtoSchema,
  DeliveryListItemSchema,
  ENGAGEMENT_COLUMN,
  FILTERABLE,
  SORTABLE,
  deliveryEventsRoute,
  listDeadRoute,
  listDeliveriesRoute,
  retryDeliveryRoute,
} from "./deliveries.contract"

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })
router.use("*", requireAuth)

export default router
  .openapi(listDeliveriesRoute, async (c) => {
    const parsed = c.req.valid("query")
    const userId = c.var.user!.id

    const statusFilter = (parsed as Record<string, unknown>).status as
      | string
      | undefined
    const engagementCol = statusFilter
      ? ENGAGEMENT_COLUMN[statusFilter]
      : undefined

    let baseQuery = c.var.db
      .selectFrom("delivery")
      .where("userId", "=", userId)
      .selectAll()

    if (engagementCol) {
      baseQuery = baseQuery.where(engagementCol, "is not", null)
      const filteredParsed = { ...parsed } as Record<string, unknown>
      delete filteredParsed.status
      const { qb, getPage } = applyListQuery(
        baseQuery,
        filteredParsed as Parameters<typeof applyListQuery>[1],
        {
          sortable: DELIVERY_SORTABLE,
          filterable: DELIVERY_FILTERABLE,
          defaultSort: DELIVERY_DEFAULT_SORT,
        }
      )
      const rows = await qb.execute()
      const page = getPage(rows as Record<string, unknown>[])
      return c.json({
        data: page.data as z.infer<typeof DeliveryListItemSchema>[],
        nextCursor: page.nextCursor,
      })
    }

    const { qb, getPage } = applyListQuery(
      baseQuery,
      parsed as Record<string, unknown>,
      {
        sortable: DELIVERY_SORTABLE,
        filterable: DELIVERY_FILTERABLE,
        defaultSort: DELIVERY_DEFAULT_SORT,
      }
    )
    const rows = await qb.execute()
    const page = getPage(rows as Record<string, unknown>[])
    return c.json({
      data: page.data as z.infer<typeof DeliveryListItemSchema>[],
      nextCursor: page.nextCursor,
    })
  })

  .openapi(deliveryEventsRoute, async (c) => {
    const { id } = c.req.param()
    const userId = c.var.user!.id

    const delivery = await c.var.db
      .selectFrom("delivery")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .select("id")
      .executeTakeFirst()
    if (!delivery) throw Errors.notFound("Delivery")

    const events = await c.var.db
      .selectFrom("delivery_event")
      .where("deliveryId", "=", id)
      .select(["id", "type", "at", "meta"])
      .orderBy("at", "asc")
      .execute()

    return c.json({ data: events })
  })

  .openapi(listDeadRoute, async (c) => {
    const parsed = c.req.valid("query")
    const userId = c.var.user!.id
    const baseQuery = c.var.db
      .selectFrom("dead_letter")
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
      data: page.data as z.infer<typeof DeadLetterDtoSchema>[],
      nextCursor: page.nextCursor,
    })
  })

  .openapi(retryDeliveryRoute, async (c) => {
    const { id } = c.req.param()
    const userId = c.var.user!.id
    const db = c.var.db

    const delivery = await db
      .selectFrom("delivery")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .selectAll()
      .executeTakeFirst()

    if (!delivery) throw Errors.notFound("Delivery")
    if (delivery.status !== "failed" && delivery.status !== "dead") {
      throw Errors.validationError(
        "Only failed or dead deliveries can be retried"
      )
    }

    const ts = new Date().toISOString()

    await db
      .updateTable("delivery")
      .set({
        status: "queued",
        attempts: 0,
        lastError: null,
        nextRetryAt: null,
        updatedAt: ts,
      })
      .where("id", "=", id)
      .execute()

    const msg: DeliveryQueueMessage = {
      deliveryId: id,
      notificationId: delivery.notificationId,
      userId,
      channel: delivery.channel,
    }
    await c.env.DELIVERY_Q.send(msg)

    return c.json({ queued: true })
  })
