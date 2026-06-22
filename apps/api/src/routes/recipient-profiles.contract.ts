import { createRoute, z } from "@hono/zod-openapi"

export const HHMM = z.string().regex(/^\d{2}:\d{2}$/)

export const PreferencesBodySchema = z.object({
  timezone: z.string().optional(),
  quietHoursStart: HHMM.optional(),
  quietHoursEnd: HHMM.optional(),
})

export const PreferencesDtoSchema = z.object({
  userId: z.string(),
  timezone: z.string().nullable(),
  quietHoursStart: z.string().nullable(),
  quietHoursEnd: z.string().nullable(),
  updatedAt: z.string(),
})

export const getRoute = createRoute({
  method: "get",
  path: "/recipients/preferences",
  responses: {
    200: {
      content: { "application/json": { schema: PreferencesDtoSchema } },
      description: "Recipient preferences",
    },
  },
})

export const patchRoute = createRoute({
  method: "patch",
  path: "/recipients/preferences",
  request: {
    body: {
      content: { "application/json": { schema: PreferencesBodySchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: PreferencesDtoSchema } },
      description: "Updated preferences",
    },
  },
})
