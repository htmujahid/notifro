import { createRoute, z } from "@hono/zod-openapi"

import { CHANNEL_TYPES } from "../channels/types"
import { listQuerySchema } from "../lib/list-query"

export const CHANNEL_ENUM = CHANNEL_TYPES as [string, ...string[]]

export const DELIVERY_SORTABLE = {
  createdAt: "createdAt",
  channel: "channel",
  status: "status",
}
export const DELIVERY_FILTERABLE = {
  channel: {
    column: "channel",
    schema: z.enum(CHANNEL_ENUM),
    operator: "eq" as const,
  },
  notificationId: {
    column: "notificationId",
    schema: z.string(),
    operator: "eq" as const,
  },
  status: {
    column: "status",
    schema: z.enum([
      "queued",
      "retrying",
      "delivered",
      "failed",
      "dead",
      "bounced",
      "opened",
      "clicked",
    ]),
    operator: "eq" as const,
  },
}

export const ENGAGEMENT_COLUMN: Record<
  string,
  "openedAt" | "clickedAt" | "bouncedAt" | "deliveredAt"
> = {
  opened: "openedAt",
  clicked: "clickedAt",
  bounced: "bouncedAt",
  delivered: "deliveredAt",
}
export const DELIVERY_DEFAULT_SORT = { key: "createdAt", order: "desc" as const }

export const DeliveryListItemSchema = z.object({
  id: z.string(),
  userId: z.string(),
  notificationId: z.string(),
  channel: z.string(),
  recipient: z.string(),
  status: z.string(),
  providerMessageId: z.string().nullable(),
  attempts: z.number(),
  deliveredAt: z.string().nullable(),
  openedAt: z.string().nullable(),
  clickedAt: z.string().nullable(),
  bouncedAt: z.string().nullable(),
  lastError: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const listDeliveriesRoute = createRoute({
  method: "get",
  path: "/deliveries",
  request: {
    query: listQuerySchema({
      sortable: DELIVERY_SORTABLE,
      filterable: DELIVERY_FILTERABLE,
      defaultSort: DELIVERY_DEFAULT_SORT,
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            data: z.array(DeliveryListItemSchema),
            nextCursor: z.string().nullable(),
          }),
        },
      },
      description: "Paginated deliveries",
    },
  },
})

export const deliveryEventsRoute = createRoute({
  method: "get",
  path: "/deliveries/:id/events",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            data: z.array(
              z.object({
                id: z.string(),
                type: z.string(),
                at: z.string(),
                meta: z.string(),
              })
            ),
          }),
        },
      },
      description: "Delivery event timeline",
    },
  },
})

export const SORTABLE = {
  failedAt: "failedAt",
  createdAt: "createdAt",
  attempts: "attempts",
}
export const FILTERABLE = {
  channel: {
    column: "channel",
    schema: z.enum(CHANNEL_ENUM),
    operator: "eq" as const,
  },
  notificationId: {
    column: "notificationId",
    schema: z.string(),
    operator: "eq" as const,
  },
  reason: {
    column: "reason",
    schema: z.string(),
    operator: "eq" as const,
  },
  errorCode: {
    column: "errorCode",
    schema: z.string(),
    operator: "eq" as const,
  },
}
export const DEFAULT_SORT = { key: "failedAt", order: "desc" as const }

export const DeadLetterDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  deliveryId: z.string(),
  notificationId: z.string(),
  channel: z.string(),
  reason: z.string(),
  errorCode: z.string().nullable(),
  error: z.string(),
  attempts: z.number(),
  failedAt: z.string(),
  createdAt: z.string(),
})

export const listDeadRoute = createRoute({
  method: "get",
  path: "/deliveries/dead",
  request: {
    query: listQuerySchema({
      sortable: SORTABLE,
      filterable: FILTERABLE,
      defaultSort: DEFAULT_SORT,
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            data: z.array(DeadLetterDtoSchema),
            nextCursor: z.string().nullable(),
          }),
        },
      },
      description: "Dead-letter entries",
    },
  },
})

export const retryDeliveryRoute = createRoute({
  method: "post",
  path: "/deliveries/:id/retry",
  responses: {
    200: {
      content: {
        "application/json": { schema: z.object({ queued: z.boolean() }) },
      },
      description: "Delivery requeued",
    },
  },
})
