import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import { sql } from "kysely"

import { CHANNEL_TYPES } from "../channels/types"
import { validationHook } from "../lib/errors"
import type { AppEnv } from "../lib/types"
import { requireAuth } from "../middleware/auth"

const CHANNEL_ENUM = CHANNEL_TYPES as [string, ...string[]]

const GRANULARITY_FMT: Record<string, string> = {
  hour: "%Y-%m-%dT%H:00:00",
  day: "%Y-%m-%d",
  week: "%Y-%W",
}

function defaultFrom(): string {
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
}

function defaultTo(): string {
  return new Date().toISOString()
}

const SummaryResponseSchema = z.object({
  sent: z.number(),
  delivered: z.number(),
  opened: z.number(),
  clicked: z.number(),
  bounced: z.number(),
  deliveryRate: z.number(),
  openRate: z.number(),
  clickRate: z.number(),
})

const TimeseriesResponseSchema = z.object({
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

const ChannelsResponseSchema = z.object({
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

const TopTopicsResponseSchema = z.object({
  data: z.array(
    z.object({
      topicKey: z.string(),
      sent: z.number(),
      delivered: z.number(),
      deliveryRate: z.number(),
    })
  ),
})

const summaryQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  channel: z.enum(CHANNEL_ENUM).optional(),
})

const timeseriesQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  granularity: z.enum(["hour", "day", "week"]).optional(),
  channel: z.enum(CHANNEL_ENUM).optional(),
})

const rangeQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
})

const summaryRoute = createRoute({
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

const timeseriesRoute = createRoute({
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

const channelsRoute = createRoute({
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

const topTopicsRoute = createRoute({
  method: "get",
  path: "/analytics/top-topics",
  request: { query: rangeQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: TopTopicsResponseSchema } },
      description: "Top topics by send volume",
    },
  },
})

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })
router.use("*", requireAuth)

router.openapi(summaryRoute, async (c) => {
  const userId = c.var.user!.id
  const db = c.var.db
  const { from, to, channel } = c.req.valid("query")
  const fromStr = from ?? defaultFrom()
  const toStr = to ?? defaultTo()

  const row = await db
    .selectFrom("delivery")
    .where("userId", "=", userId)
    .where("createdAt", ">=", fromStr)
    .where("createdAt", "<=", toStr)
    .$if(!!channel, (qb) => qb.where("channel", "=", channel!))
    .select([
      sql<number>`COUNT(*)`.as("sent"),
      sql<number>`COUNT("deliveredAt")`.as("delivered"),
      sql<number>`COUNT("openedAt")`.as("opened"),
      sql<number>`COUNT("clickedAt")`.as("clicked"),
      sql<number>`COUNT("bouncedAt")`.as("bounced"),
    ])
    .executeTakeFirstOrThrow()

  const sent = Number(row.sent)
  const delivered = Number(row.delivered)
  const opened = Number(row.opened)
  const clicked = Number(row.clicked)
  const bounced = Number(row.bounced)

  return c.json({
    sent,
    delivered,
    opened,
    clicked,
    bounced,
    deliveryRate: sent > 0 ? Math.round((delivered / sent) * 1000) / 10 : 0,
    openRate: delivered > 0 ? Math.round((opened / delivered) * 1000) / 10 : 0,
    clickRate: opened > 0 ? Math.round((clicked / opened) * 1000) / 10 : 0,
  })
})

router.openapi(timeseriesRoute, async (c) => {
  const userId = c.var.user!.id
  const db = c.var.db
  const { from, to, granularity, channel } = c.req.valid("query")
  const fromStr = from ?? defaultFrom()
  const toStr = to ?? defaultTo()
  const fmt = GRANULARITY_FMT[granularity ?? "day"]
  const periodExpr = sql.raw(`strftime('${fmt}', "createdAt")`)

  const rows = await db
    .selectFrom("delivery")
    .where("userId", "=", userId)
    .where("createdAt", ">=", fromStr)
    .where("createdAt", "<=", toStr)
    .$if(!!channel, (qb) => qb.where("channel", "=", channel!))
    .select([
      periodExpr.as("period"),
      sql<number>`COUNT(*)`.as("sent"),
      sql<number>`COUNT("deliveredAt")`.as("delivered"),
      sql<number>`COUNT("openedAt")`.as("opened"),
      sql<number>`COUNT("clickedAt")`.as("clicked"),
    ])
    .groupBy(periodExpr)
    .orderBy(periodExpr)
    .execute()

  return c.json({
    data: rows.map((r) => ({
      period: r.period as string,
      sent: Number(r.sent),
      delivered: Number(r.delivered),
      opened: Number(r.opened),
      clicked: Number(r.clicked),
    })),
  })
})

router.openapi(channelsRoute, async (c) => {
  const userId = c.var.user!.id
  const db = c.var.db
  const { from, to } = c.req.valid("query")
  const fromStr = from ?? defaultFrom()
  const toStr = to ?? defaultTo()

  const rows = await db
    .selectFrom("delivery")
    .where("userId", "=", userId)
    .where("createdAt", ">=", fromStr)
    .where("createdAt", "<=", toStr)
    .select([
      "channel",
      sql<number>`COUNT(*)`.as("sent"),
      sql<number>`COUNT("deliveredAt")`.as("delivered"),
      sql<number>`COUNT("openedAt")`.as("opened"),
      sql<number>`COUNT("clickedAt")`.as("clicked"),
      sql<number>`COUNT("bouncedAt")`.as("bounced"),
    ])
    .groupBy("channel")
    .orderBy(sql`COUNT(*)`, "desc")
    .execute()

  return c.json({
    data: rows.map((r) => {
      const sent = Number(r.sent)
      const delivered = Number(r.delivered)
      return {
        channel: r.channel,
        sent,
        delivered,
        opened: Number(r.opened),
        clicked: Number(r.clicked),
        bounced: Number(r.bounced),
        deliveryRate: sent > 0 ? Math.round((delivered / sent) * 1000) / 10 : 0,
      }
    }),
  })
})

router.openapi(topTopicsRoute, async (c) => {
  const userId = c.var.user!.id
  const db = c.var.db
  const { from, to } = c.req.valid("query")
  const fromStr = from ?? defaultFrom()
  const toStr = to ?? defaultTo()
  const topicExpr = sql.raw(`json_extract(n."payload", '$.topicKey')`)

  const rows = await db
    .selectFrom("delivery as d")
    .innerJoin("notification as n", "n.id", "d.notificationId")
    .where("d.userId", "=", userId)
    .where("d.createdAt", ">=", fromStr)
    .where("d.createdAt", "<=", toStr)
    .where(sql<boolean>`${topicExpr} IS NOT NULL`)
    .select([
      topicExpr.as("topicKey"),
      sql<number>`COUNT(*)`.as("sent"),
      sql<number>`COUNT(d."deliveredAt")`.as("delivered"),
    ])
    .groupBy(topicExpr)
    .orderBy(sql`COUNT(*)`, "desc")
    .limit(10)
    .execute()

  return c.json({
    data: rows.map((r) => {
      const sent = Number(r.sent)
      const delivered = Number(r.delivered)
      return {
        topicKey: r.topicKey as string,
        sent,
        delivered,
        deliveryRate: sent > 0 ? Math.round((delivered / sent) * 1000) / 10 : 0,
      }
    }),
  })
})

export default router
