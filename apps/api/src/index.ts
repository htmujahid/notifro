import { OpenAPIHono } from "@hono/zod-openapi"

import "./channels/in-app"
import "./channels/email"
import "./channels/sms"
import "./channels/whatsapp"
import "./channels/slack"
import "./channels/teams"
import "./channels/discord"
import "./channels/telegram"
import "./channels/web-push/adapter"
import "./channels/webhook/adapter"
import { db } from "./db/client"
import { authInstance } from "./lib/auth"
import { ApiError, validationHook } from "./lib/errors"
import type { AppEnv } from "./lib/types"
import { handleDeliveryQueue } from "./queue/consumer"
import { registerRoutes } from "./routes"
import { handleScheduledSweep } from "./scheduling/sweep"

const app = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })

app.onError((err, c) => {
  if (err instanceof ApiError) {
    return c.json(
      {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
        },
      },
      err.httpStatus as 400 | 401 | 403 | 404 | 422 | 500
    )
  }
  console.error(err)
  return c.json(
    { error: { code: "internal_error", message: "Internal server error" } },
    500
  )
})

app.use("*", async (c, next) => {
  c.set("db", db(c.env.DB))
  await next()
})

app.use("*", async (c, next) => {
  c.set("sandboxMode", false)
  c.set("apiKeyId", null)

  const authHeader = c.req.header("Authorization")
  const apiKeyHeader = c.req.header("X-API-Key")
  const rawKey =
    apiKeyHeader ??
    (authHeader?.startsWith("Bearer rk_") ? authHeader.slice(7) : null)

  if (rawKey?.startsWith("rk_")) {
    const verified = await authInstance.api.verifyApiKey({
      body: { key: rawKey },
    })
    if (verified.valid && verified.key) {
      const apiKey = verified.key
      const dbUser = await c.var.db
        .selectFrom("user")
        .where("id", "=", apiKey.referenceId)
        .selectAll()
        .executeTakeFirst()
      if (dbUser) {
        c.set("user", dbUser)
        c.set("session", null)
        const meta = apiKey.metadata as { mode?: string } | null
        c.set(
          "sandboxMode",
          meta?.mode === "test" ||
            c.req.header("X-Renderical-Sandbox") === "true"
        )
        c.set("apiKeyId", apiKey.id)
        await next()
        return
      }
    }
  }

  c.set("sandboxMode", c.req.header("X-Renderical-Sandbox") === "true")

  const session = await authInstance.api.getSession({
    headers: c.req.raw.headers,
  })
  if (!session) {
    c.set("user", null)
    c.set("session", null)
  } else {
    c.set("user", session.user)
    c.set("session", session.session)
  }
  await next()
})

const routes = registerRoutes(app)

export type AppType = typeof routes

export default {
  fetch: app.fetch.bind(app),
  async queue(
    batch: MessageBatch<import("./queue/consumer").DeliveryQueueMessage>,
    env: CloudflareBindings
  ) {
    await handleDeliveryQueue(batch, env)
  },
  async scheduled(
    _event: ScheduledEvent,
    env: CloudflareBindings,
    _ctx: ExecutionContext
  ) {
    await handleScheduledSweep(env)
  },
}
