import { createRoute, z } from "@hono/zod-openapi"

import { CHANNEL_TYPES } from "../channels/types"

const CHANNEL_ENUM = CHANNEL_TYPES as [string, ...string[]]

export const SummaryResponseSchema = z.object({
  sent: z.number(),
  delivered: z.number(),
  opened: z.number(),
  clicked: z.number(),
  bounced: z.number(),
  deliveryRate: z.number(),
  openRate: z.number(),
  clickRate: z.number(),
})

export const TimeseriesResponseSchema = z.object({
  data: z.array(
    z.object({
      period: z.string(),
      sent: z.number(),
      delivered: z.number(),
      opened: z.number(),
      clicked: z.number(),
    })
  ),
})

export const ChannelsResponseSchema = z.object({
  data: z.array(
    z.object({
      channel: z.string(),
      sent: z.number(),
      delivered: z.number(),
      opened: z.number(),
      clicked: z.number(),
      bounced: z.number(),
      deliveryRate: z.number(),
    })
  ),
})

export const summaryQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  channel: z.enum(CHANNEL_ENUM).optional(),
})

export const timeseriesQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  granularity: z.enum(["hour", "day", "week"]).optional(),
  channel: z.enum(CHANNEL_ENUM).optional(),
})

export const rangeQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
})

export const summaryRoute = createRoute({
  method: "get",
  path: "/analytics/summary",
  request: { query: summaryQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: SummaryResponseSchema } },
      description: "Analytics summary",
    },
  },
})

export const timeseriesRoute = createRoute({
  method: "get",
  path: "/analytics/timeseries",
  request: { query: timeseriesQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: TimeseriesResponseSchema } },
      description: "Analytics timeseries",
    },
  },
})

export const channelsRoute = createRoute({
  method: "get",
  path: "/analytics/channels",
  request: { query: rangeQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: ChannelsResponseSchema } },
      description: "Per-channel analytics",
    },
  },
})

