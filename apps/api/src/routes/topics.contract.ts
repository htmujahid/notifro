import { createRoute, z } from "@hono/zod-openapi"

import { listQuerySchema } from "../lib/list-query"

export const SORTABLE = {
  name: "name",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
}
export const FILTERABLE = {
  q: { column: "name", schema: z.string(), operator: "like" as const },
  transactional: {
    column: "transactional",
    schema: z.coerce.number().int().min(0).max(1),
    operator: "eq" as const,
  },
  defaultOptIn: {
    column: "defaultOptIn",
    schema: z.coerce.number().int().min(0).max(1),
    operator: "eq" as const,
  },
}
export const DEFAULT_SORT = { key: "createdAt", order: "desc" as const }

export const TopicDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  defaultOptIn: z.number(),
  transactional: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const CreateTopicSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^[a-z0-9_-]+$/,
      "key must be lowercase alphanumeric, hyphens, or underscores"
    ),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  defaultOptIn: z.boolean().optional().default(true),
  transactional: z.boolean().optional().default(false),
})

export const PatchTopicSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  defaultOptIn: z.boolean().optional(),
  transactional: z.boolean().optional(),
})

export const ListResponseSchema = z.object({
  data: z.array(TopicDtoSchema),
  nextCursor: z.string().nullable(),
})

export const listRoute = createRoute({
  method: "get",
  path: "/topics",
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
      description: "Paginated topics",
    },
  },
})

export const createRoute_ = createRoute({
  method: "post",
  path: "/topics",
  request: {
    body: { content: { "application/json": { schema: CreateTopicSchema } } },
  },
  responses: {
    201: {
      content: { "application/json": { schema: TopicDtoSchema } },
      description: "Topic created",
    },
  },
})

export const detailRoute = createRoute({
  method: "get",
  path: "/topics/:id",
  responses: {
    200: {
      content: { "application/json": { schema: TopicDtoSchema } },
      description: "Topic detail",
    },
  },
})

export const patchRoute = createRoute({
  method: "patch",
  path: "/topics/:id",
  request: {
    body: { content: { "application/json": { schema: PatchTopicSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: TopicDtoSchema } },
      description: "Topic updated",
    },
  },
})

export const deleteRoute = createRoute({
  method: "delete",
  path: "/topics/:id",
  responses: {
    204: { description: "Topic deleted" },
  },
})
