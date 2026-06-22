import { createRoute, z } from "@hono/zod-openapi"

export const PreferenceDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  recipientId: z.string(),
  channel: z.string(),
  topicId: z.string().nullable(),
  optedIn: z.number(),
  source: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const TopicWithPrefSchema = z.object({
  topicId: z.string(),
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  transactional: z.number(),
  channels: z.array(
    z.object({
      channel: z.string(),
      optedIn: z.boolean(),
    })
  ),
})

export const PreferenceCenterSchema = z.object({
  recipientId: z.string(),
  topics: z.array(TopicWithPrefSchema),
  globalOptOut: z.array(z.string()),
})

export const UpdatePreferencesSchema = z.object({
  topicId: z.string().nullable().optional(),
  channel: z.string(),
  optedIn: z.boolean(),
})

export const ChannelPriorityDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  recipientId: z.string(),
  order: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const generateTokenRoute = createRoute({
  method: "post",
  path: "/preferences/token",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({ recipientId: z.string() }),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ token: z.string(), expiresAt: z.string() }),
        },
      },
      description: "Signed preference center token",
    },
  },
})

export const recipientPrefsRoute = createRoute({
  method: "get",
  path: "/recipients/:id/preferences",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ data: z.array(PreferenceDtoSchema) }),
        },
      },
      description: "Preferences for a recipient",
    },
  },
})

export const adminSetPreferenceRoute = createRoute({
  method: "put",
  path: "/recipients/:id/preferences",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            preferences: z.array(UpdatePreferencesSchema),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": { schema: z.object({ updated: z.number() }) },
      },
      description: "Updated preferences",
    },
  },
})

export const channelPriorityRoute = createRoute({
  method: "get",
  path: "/recipients/:id/channel-priority",
  responses: {
    200: {
      content: { "application/json": { schema: ChannelPriorityDtoSchema } },
      description: "Channel priority",
    },
    404: { description: "Not set" },
  },
})

export const setChannelPriorityRoute = createRoute({
  method: "put",
  path: "/recipients/:id/channel-priority",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({ order: z.array(z.string()).min(1) }),
        },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: ChannelPriorityDtoSchema } },
      description: "Channel priority updated",
    },
  },
})

export const prefCenterGetRoute = createRoute({
  method: "get",
  path: "/preferences/center",
  request: { query: z.object({ token: z.string() }) },
  responses: {
    200: {
      content: { "application/json": { schema: PreferenceCenterSchema } },
      description: "Preference center data",
    },
    401: { description: "Invalid or expired token" },
  },
})

export const prefCenterPostRoute = createRoute({
  method: "post",
  path: "/preferences/center",
  request: {
    query: z.object({ token: z.string() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            preferences: z.array(UpdatePreferencesSchema),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": { schema: z.object({ updated: z.number() }) },
      },
      description: "Preferences updated",
    },
    401: { description: "Invalid or expired token" },
  },
})

export const unsubscribeGetRoute = createRoute({
  method: "get",
  path: "/unsubscribe",
  request: { query: z.object({ token: z.string() }) },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            recipientId: z.string(),
            email: z.string().nullable(),
            ok: z.boolean(),
          }),
        },
      },
      description: "Token valid",
    },
    401: { description: "Invalid or expired token" },
  },
})

export const unsubscribePostRoute = createRoute({
  method: "post",
  path: "/unsubscribe",
  request: { query: z.object({ token: z.string() }) },
  responses: {
    200: {
      content: {
        "application/json": { schema: z.object({ ok: z.boolean() }) },
      },
      description: "Unsubscribed",
    },
    401: { description: "Invalid or expired token" },
  },
})
