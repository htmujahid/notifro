import { createRoute, z } from "@hono/zod-openapi"

export const SORTABLE = { createdAt: "createdAt" }
export const FILTERABLE = {
  filter: {
    column: "readAt",
    schema: z.enum(["all", "unread", "read"]),
    operator: "eq" as const,
  },
}
export const DEFAULT_SORT = { key: "createdAt", order: "desc" as const }

export const InboxMessageDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  notificationId: z.string().nullable(),
  deliveryId: z.string().nullable(),
  title: z.string(),
  body: z.string().nullable(),
  icon: z.string().nullable(),
  url: z.string().nullable(),
  seenAt: z.string().nullable(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const ListResponseSchema = z.object({
  data: z.array(InboxMessageDtoSchema),
  nextCursor: z.string().nullable(),
})

export const listRoute = createRoute({
  method: "get",
  path: "/inbox",
  request: {
    query: z.object({
      limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
      cursor: z.string().optional(),
      filter: z.enum(["all", "unread", "read"]).optional(),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: ListResponseSchema } },
      description: "Paginated inbox messages",
    },
  },
})

export const unreadCountRoute = createRoute({
  method: "get",
  path: "/inbox/unread-count",
  responses: {
    200: {
      content: {
        "application/json": { schema: z.object({ count: z.number() }) },
      },
      description: "Unread message count",
    },
  },
})

export const markReadRoute = createRoute({
  method: "post",
  path: "/inbox/:id/read",
  responses: {
    200: {
      content: { "application/json": { schema: InboxMessageDtoSchema } },
      description: "Message marked as read",
    },
  },
})

export const markAllReadRoute = createRoute({
  method: "post",
  path: "/inbox/read-all",
  responses: {
    200: {
      content: {
        "application/json": { schema: z.object({ updated: z.number() }) },
      },
      description: "All messages marked as read",
    },
  },
})
