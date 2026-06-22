import { createRoute, z } from "@hono/zod-openapi"

import { listQuerySchema } from "../lib/list-query"

export const SORTABLE = {
  updatedAt: "updatedAt",
  createdAt: "createdAt",
  email: "email",
}
export const FILTERABLE = {
  q: { column: "email", schema: z.string(), operator: "like" as const },
}
export const DEFAULT_SORT = { key: "updatedAt", order: "desc" as const }

export const RecipientDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  externalId: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  locale: z.string().nullable(),
  timezone: z.string().nullable(),
  attributes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const CreateRecipientSchema = z.object({
  externalId: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  locale: z.string().optional(),
  timezone: z.string().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
})

export const PatchRecipientSchema = CreateRecipientSchema.partial()

export const IdentifySchema = z.object({
  externalId: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  locale: z.string().optional(),
  timezone: z.string().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
})

export const ListResponseSchema = z.object({
  data: z.array(RecipientDtoSchema),
  nextCursor: z.string().nullable(),
})

export const listRoute = createRoute({
  method: "get",
  path: "/recipients",
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
      description: "Paginated recipients",
    },
  },
})

export const createRoute_ = createRoute({
  method: "post",
  path: "/recipients",
  request: {
    body: {
      content: { "application/json": { schema: CreateRecipientSchema } },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: RecipientDtoSchema } },
      description: "Created recipient",
    },
  },
})

export const detailRoute = createRoute({
  method: "get",
  path: "/recipients/:id",
  responses: {
    200: {
      content: { "application/json": { schema: RecipientDtoSchema } },
      description: "Recipient detail",
    },
  },
})

export const patchRoute = createRoute({
  method: "patch",
  path: "/recipients/:id",
  request: {
    body: { content: { "application/json": { schema: PatchRecipientSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: RecipientDtoSchema } },
      description: "Updated recipient",
    },
  },
})

export const deleteRoute = createRoute({
  method: "delete",
  path: "/recipients/:id",
  responses: { 204: { description: "Deleted" } },
})

export const identifyRoute = createRoute({
  method: "post",
  path: "/recipients/identify",
  request: {
    body: { content: { "application/json": { schema: IdentifySchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: RecipientDtoSchema } },
      description: "Upserted recipient",
    },
  },
})
