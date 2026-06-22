import { createRoute, z } from "@hono/zod-openapi"

import { listQuerySchema } from "../lib/list-query"

export const SORTABLE = {
  updatedAt: "updatedAt",
  name: "name",
  createdAt: "createdAt",
}
export const FILTERABLE = {
  q: { column: "name", schema: z.string(), operator: "like" as const },
}
export const DEFAULT_SORT = { key: "updatedAt", order: "desc" as const }

export const SnippetDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  content: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const CreateSnippetSchema = z.object({
  name: z.string().min(1).max(255),
  content: z.record(z.string(), z.unknown()),
})

export const listRoute = createRoute({
  method: "get",
  path: "/snippets",
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
            data: z.array(SnippetDtoSchema),
            nextCursor: z.string().nullable(),
          }),
        },
      },
      description: "Snippets list",
    },
  },
})

export const createRoute_ = createRoute({
  method: "post",
  path: "/snippets",
  request: {
    body: { content: { "application/json": { schema: CreateSnippetSchema } } },
  },
  responses: {
    201: {
      content: { "application/json": { schema: SnippetDtoSchema } },
      description: "Created snippet",
    },
  },
})

export const patchRoute = createRoute({
  method: "patch",
  path: "/snippets/:id",
  request: {
    body: {
      content: {
        "application/json": { schema: CreateSnippetSchema.partial() },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SnippetDtoSchema } },
      description: "Updated snippet",
    },
  },
})

export const deleteRoute = createRoute({
  method: "delete",
  path: "/snippets/:id",
  responses: { 204: { description: "Deleted" } },
})
