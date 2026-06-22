import { createRoute, z } from "@hono/zod-openapi"

export const TriggerEventSchema = z.object({
  name: z.string().min(1),
  recipientId: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional().default({}),
})

export const TriggerEventResponseSchema = z.object({
  eventId: z.string(),
  journeysTriggered: z.number(),
})

export const triggerRoute = createRoute({
  method: "post",
  path: "/events",
  request: {
    body: { content: { "application/json": { schema: TriggerEventSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: TriggerEventResponseSchema } },
      description: "Event recorded and matching journeys triggered",
    },
  },
})
