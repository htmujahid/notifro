import { createRoute, z } from "@hono/zod-openapi"

export const SubscribeBodySchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
  userAgent: z.string().optional(),
})

export const UnsubscribeBodySchema = z.object({
  endpoint: z.string().url(),
})

export const VapidKeyResponseSchema = z.object({
  publicKey: z.string(),
})

export const OkResponseSchema = z.object({ ok: z.boolean() })

export const subscribeRoute = createRoute({
  method: "post",
  path: "/push/subscribe",
  request: {
    body: { content: { "application/json": { schema: SubscribeBodySchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: OkResponseSchema } },
      description: "Subscribed",
    },
  },
})

export const unsubscribeRoute = createRoute({
  method: "post",
  path: "/push/unsubscribe",
  request: {
    body: {
      content: { "application/json": { schema: UnsubscribeBodySchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: OkResponseSchema } },
      description: "Unsubscribed",
    },
  },
})

export const vapidKeyRoute = createRoute({
  method: "get",
  path: "/push/vapid-public-key",
  responses: {
    200: {
      content: { "application/json": { schema: VapidKeyResponseSchema } },
      description: "VAPID public key",
    },
  },
})
