import { createRoute, z } from "@hono/zod-openapi"

import { CHANNEL_TYPES, CONNECTION_STATUSES } from "../channels/types"
import type { ChannelType, ConnectionStatus } from "../channels/types"
import { listQuerySchema } from "../lib/list-query"

export const ChannelTypeEnum = z.enum(
  CHANNEL_TYPES as [ChannelType, ...ChannelType[]]
)
export const StatusEnum = z.enum(
  CONNECTION_STATUSES as [ConnectionStatus, ...ConnectionStatus[]]
)

export const SORTABLE = {
  createdAt: "createdAt",
  name: "name",
  channelType: "type",
  status: "status",
}

export const FILTERABLE = {
  channelType: {
    column: "type",
    schema: ChannelTypeEnum,
    operator: "eq" as const,
  },
  status: { column: "status", schema: StatusEnum, operator: "eq" as const },
}

export const DEFAULT_SORT = { key: "createdAt", order: "desc" as const }

export const ConnectionDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.string(),
  name: z.string(),
  status: z.string(),
  config: z.string(),
  metadata: z.string().nullable(),
  health: z.string().nullable(),
  lastUsedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const ListResponseSchema = z.object({
  data: z.array(ConnectionDtoSchema),
  nextCursor: z.string().nullable(),
})

export const listRoute = createRoute({
  method: "get",
  path: "/connections",
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
      description: "Paginated connections",
    },
  },
})

export const CreateBodySchema = z.object({
  type: ChannelTypeEnum,
  name: z.string().min(1).max(255),
  config: z.record(z.string(), z.unknown()).optional().default({}),
  credentials: z.record(z.string(), z.unknown()).optional(),
})

export const createRoute_ = createRoute({
  method: "post",
  path: "/connections",
  request: {
    body: { content: { "application/json": { schema: CreateBodySchema } } },
  },
  responses: {
    201: {
      content: { "application/json": { schema: ConnectionDtoSchema } },
      description: "Created connection",
    },
  },
})

export const UpdateBodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  credentials: z.record(z.string(), z.unknown()).optional(),
  status: StatusEnum.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const updateRoute = createRoute({
  method: "patch",
  path: "/connections/:id",
  request: {
    body: { content: { "application/json": { schema: UpdateBodySchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: ConnectionDtoSchema } },
      description: "Updated connection",
    },
  },
})

export const deleteRoute = createRoute({
  method: "delete",
  path: "/connections/:id",
  responses: {
    200: {
      content: {
        "application/json": { schema: z.object({ ok: z.boolean() }) },
      },
      description: "Deleted",
    },
  },
})

export const HealthResultSchema = z.object({
  ok: z.boolean(),
  message: z.string().optional(),
  checkedAt: z.string(),
})

export const healthRoute = createRoute({
  method: "post",
  path: "/connections/:id/health",
  responses: {
    200: {
      content: { "application/json": { schema: HealthResultSchema } },
      description: "Health check result",
    },
  },
})
