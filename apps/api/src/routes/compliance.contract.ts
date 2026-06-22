import { createRoute, z } from "@hono/zod-openapi"

import { listQuerySchema } from "../lib/list-query"

export const SuppressionDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  channel: z.string(),
  address: z.string(),
  reason: z.string(),
  createdAt: z.string(),
})

export const ConsentEventDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  recipientId: z.string().nullable(),
  channel: z.string(),
  topicId: z.string().nullable(),
  event: z.string(),
  source: z.string(),
  actorNote: z.string().nullable(),
  createdAt: z.string(),
})

export const SUPP_SORTABLE = { createdAt: "createdAt", channel: "channel" }
export const SUPP_FILTERABLE = {
  channel: { column: "channel", schema: z.string(), operator: "eq" as const },
  reason: { column: "reason", schema: z.string(), operator: "eq" as const },
}
export const SUPP_DEFAULT_SORT = { key: "createdAt", order: "desc" as const }

export const CE_SORTABLE = { createdAt: "createdAt" }
export const CE_FILTERABLE = {
  channel: { column: "channel", schema: z.string(), operator: "eq" as const },
  recipientId: {
    column: "recipientId",
    schema: z.string(),
    operator: "eq" as const,
  },
  event: { column: "event", schema: z.string(), operator: "eq" as const },
  source: { column: "source", schema: z.string(), operator: "eq" as const },
}
export const CE_DEFAULT_SORT = { key: "createdAt", order: "desc" as const }

export const listSuppressionsRoute = createRoute({
  method: "get",
  path: "/suppressions",
  request: {
    query: listQuerySchema({
      sortable: SUPP_SORTABLE,
      filterable: SUPP_FILTERABLE,
      defaultSort: SUPP_DEFAULT_SORT,
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            data: z.array(SuppressionDtoSchema),
            nextCursor: z.string().nullable(),
          }),
        },
      },
      description: "Suppression list",
    },
  },
})

export const addSuppressionRoute = createRoute({
  method: "post",
  path: "/suppressions",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            channel: z.string().min(1),
            address: z.string().min(1),
            reason: z.enum([
              "hard_bounce",
              "complaint",
              "unsubscribe",
              "manual",
            ]),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: SuppressionDtoSchema } },
      description: "Suppression added",
    },
  },
})

export const deleteSuppressionRoute = createRoute({
  method: "delete",
  path: "/suppressions/:id",
  responses: {
    204: { description: "Removed" },
    404: { description: "Not found" },
  },
})

export const listConsentEventsRoute = createRoute({
  method: "get",
  path: "/consent-events",
  request: {
    query: listQuerySchema({
      sortable: CE_SORTABLE,
      filterable: CE_FILTERABLE,
      defaultSort: CE_DEFAULT_SORT,
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            data: z.array(ConsentEventDtoSchema),
            nextCursor: z.string().nullable(),
          }),
        },
      },
      description: "Consent event log",
    },
  },
})
