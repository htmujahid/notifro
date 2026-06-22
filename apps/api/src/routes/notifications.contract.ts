import { createRoute, z } from "@hono/zod-openapi"

import { ComposePayloadSchema } from "../compose/schema"
import { listQuerySchema } from "../lib/list-query"

export const SendRequestSchema = ComposePayloadSchema.extend({
  content: ComposePayloadSchema.shape.content.optional(),
  templateId: z.string().optional(),
  templateSlug: z.string().optional(),
  templateData: z.record(z.string(), z.unknown()).optional(),
  templateLocale: z.string().optional(),
  topicKey: z.string().optional(),
  chainId: z.string().optional(),
}).refine(
  (v) =>
    v.content !== undefined ||
    v.templateId !== undefined ||
    v.templateSlug !== undefined,
  { message: "Either content or templateId/templateSlug is required" }
)

export const SORTABLE = { createdAt: "createdAt", status: "status" }
export const FILTERABLE = {
  status: {
    column: "status",
    schema: z.enum(["queued", "processing", "completed", "failed"]),
    operator: "eq" as const,
  },
}
export const DEFAULT_SORT = { key: "createdAt", order: "desc" as const }

export const DeliveryDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  notificationId: z.string(),
  channel: z.string(),
  recipient: z.string(),
  status: z.string(),
  providerMessageId: z.string().nullable(),
  error: z.string().nullable(),
  attempts: z.number(),
  nextRetryAt: z.string().nullable(),
  lastError: z.string().nullable(),
  deliveredAt: z.string().nullable(),
  openedAt: z.string().nullable(),
  clickedAt: z.string().nullable(),
  bouncedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const NotificationDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  payload: z.string(),
  subject: z.string().nullable(),
  channels: z.string(),
  mode: z.string(),
  status: z.string(),
  templateId: z.string().nullable(),
  templateData: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const NotificationWithDeliveriesSchema = NotificationDtoSchema.extend({
  deliveries: z.array(DeliveryDtoSchema),
})

export const ListResponseSchema = z.object({
  data: z.array(NotificationDtoSchema),
  nextCursor: z.string().nullable(),
})

export const ScheduledResponseSchema = z.object({
  id: z.string(),
  sendAt: z.string(),
  status: z.literal("pending"),
  scheduled: z.literal(true),
})

export const sendRoute = createRoute({
  method: "post",
  path: "/notifications",
  request: {
    body: { content: { "application/json": { schema: SendRequestSchema } } },
  },
  responses: {
    200: {
      content: {
        "application/json": { schema: NotificationWithDeliveriesSchema },
      },
      description: "Notification enqueued",
    },
    202: {
      content: { "application/json": { schema: ScheduledResponseSchema } },
      description: "Notification scheduled for future delivery",
    },
  },
})

export const listRoute = createRoute({
  method: "get",
  path: "/notifications",
  request: {
    query: listQuerySchema({
      sortable: SORTABLE,
      filterable: FILTERABLE,
      defaultSort: DEFAULT_SORT,
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: ListResponseSchema } },
      description: "Paginated notifications",
    },
  },
})

export const detailRoute = createRoute({
  method: "get",
  path: "/notifications/:id",
  responses: {
    200: {
      content: {
        "application/json": { schema: NotificationWithDeliveriesSchema },
      },
      description: "Notification with deliveries",
    },
  },
})
