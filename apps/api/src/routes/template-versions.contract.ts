import { createRoute, z } from "@hono/zod-openapi"

import { listQuerySchema } from "../lib/list-query"

export const SORTABLE = { version: "version", createdAt: "createdAt" }
export const FILTERABLE = {}
export const DEFAULT_SORT = { key: "version", order: "desc" as const }

export const VersionDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  templateId: z.string(),
  version: z.number(),
  content: z.string(),
  localeStrings: z.string().nullable(),
  variables: z.string().nullable(),
  createdAt: z.string(),
})

export const listVersionsRoute = createRoute({
  method: "get",
  path: "/templates/:id/versions",
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
            data: z.array(VersionDtoSchema),
            nextCursor: z.string().nullable(),
          }),
        },
      },
      description: "Version history",
    },
  },
})

export const restoreVersionRoute = createRoute({
  method: "post",
  path: "/templates/:id/versions/:version/restore",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            id: z.string(),
            version: z.number(),
            message: z.string(),
          }),
        },
      },
      description: "Restored version",
    },
  },
})
