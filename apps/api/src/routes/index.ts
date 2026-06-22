import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import { Scalar } from "@scalar/hono-api-reference"
import { cors } from "hono/cors"

import {
  WebStandardStreamableHTTPServerTransport,
  createMcpServer,
} from "@renderical/mcp"

import { authInstance } from "../lib/auth"
import { redactPii } from "../lib/redact"
import type { AppEnv } from "../lib/types"
import analyticsRouter from "./analytics"
import brandKitRouter from "./brand-kit"
import chainsRouter from "./chains"
import connectionsRouter from "./connections"
import deliveriesRouter from "./deliveries"
import eventsRouter from "./events"
import inboxRouter from "./inbox"
import journeysRouter from "./journeys"
import mcpRouter from "./mcp"
import notificationsRouter from "./notifications"
import overviewRouter from "./overview"
import preferencesRouter from "./preferences"
import providerFallbacksRouter from "./provider-fallbacks"
import pushRouter from "./push"
import rateLimitsRouter from "./rate-limits"
import receiptsRouter from "./receipts"
import recipientProfilesRouter from "./recipient-profiles"
import recipientsRouter from "./recipients"
import recurringRouter from "./recurring"
import requestLogRouter from "./request-log"
import routingRouter from "./routing"
import schedulesRouter from "./schedules"
import segmentsRouter from "./segments"
import snippetsRouter from "./snippets"
import templateVersionsRouter from "./template-versions"
import templatesRouter from "./templates"
import topicsRouter from "./topics"
import trackingRouter from "./tracking"
import webhooksRouter from "./webhooks"

const HelloResponseSchema = z.object({
  message: z.string().openapi({ example: "Hello, World!" }),
})

const helloRoute = createRoute({
  method: "get",
  path: "/api/hello",
  responses: {
    200: {
      content: { "application/json": { schema: HelloResponseSchema } },
      description: "Returns a hello message",
    },
  },
})

const DbHealthResponseSchema = z.object({
  userCount: z.number().openapi({ example: 1 }),
})

const dbHealthRoute = createRoute({
  method: "get",
  path: "/api/_db/health",
  responses: {
    200: {
      content: { "application/json": { schema: DbHealthResponseSchema } },
      description: "Returns user count via Kysely to verify D1 dialect wiring",
    },
  },
})

export function registerRoutes(app: OpenAPIHono<AppEnv>) {
  app.use("/api/*", (c, next) => {
    return cors({
      origin: c.env.FRONTEND_URL,
      allowHeaders: ["Content-Type", "Authorization", "X-API-Key"],
      allowMethods: ["POST", "GET", "PATCH", "PUT", "DELETE", "OPTIONS"],
      exposeHeaders: ["Content-Length"],
      maxAge: 600,
      credentials: true,
    })(c, next)
  })

  app.use("/api/*", async (c, next) => {
    const start = Date.now()
    await next()
    const userId = c.var.user?.id
    if (
      userId &&
      !c.req.path.includes("/api/request-log") &&
      !c.req.path.includes("/api/auth/")
    ) {
      const ms = Date.now() - start
      c.var.db
        .insertInto("api_request_log")
        .values({
          id: crypto.randomUUID(),
          userId,
          apiKeyId: c.var.apiKeyId,
          method: c.req.method,
          path: redactPii(new URL(c.req.url).pathname),
          status: c.res.status,
          latencyMs: ms,
          createdAt: new Date().toISOString(),
        })
        .execute()
        .catch(() => {})
    }
  })

  app.on(["POST", "GET"], "/api/auth/*", (c) => {
    return authInstance.handler(c.req.raw)
  })

  app.get("/health", async (c) => {
    const ts = new Date().toISOString()
    try {
      await c.var.db
        .selectFrom("user")
        .select(c.var.db.fn.countAll<number>().as("n"))
        .executeTakeFirstOrThrow()
      return c.json({ status: "ok", db: "ok", queue: "ok", ts })
    } catch {
      return c.json({ status: "error", db: "error", queue: "ok", ts }, 503)
    }
  })

  app.get("/", (c) => {
    return c.text("Hello Hono!")
  })

  const routes = app
    .openapi(helloRoute, (c) => {
      return c.json({ message: "Hello, World!" })
    })
    .openapi(dbHealthRoute, async (c) => {
      const result = await c.var.db
        .selectFrom("user")
        .select(c.var.db.fn.countAll<number>().as("n"))
        .executeTakeFirstOrThrow()
      return c.json({ userCount: Number(result.n) })
    })
    .route("/api", connectionsRouter)
    .route("/api", notificationsRouter)
    .route("/api", templatesRouter)
    .route("/api", inboxRouter)
    .route("/api", overviewRouter)
    .route("/api", pushRouter)
    .route("/api", webhooksRouter)
    .route("/api", deliveriesRouter)
    .route("/t", trackingRouter)
    .route("/webhooks", receiptsRouter)
    .route("/api", schedulesRouter)
    .route("/api", recipientProfilesRouter)
    .route("/api", recurringRouter)
    .route("/api", templateVersionsRouter)
    .route("/api", snippetsRouter)
    .route("/api", brandKitRouter)
    .route("/api", recipientsRouter)
    .route("/api", segmentsRouter)
    .route("/api", topicsRouter)
    .route("/api", preferencesRouter)
    .route("/api", routingRouter)
    .route("/api", chainsRouter)
    .route("/api", rateLimitsRouter)
    .route("/api", requestLogRouter)
    .route("/api", mcpRouter)
    .route("/api", analyticsRouter)
    .route("/api", journeysRouter)
    .route("/api", eventsRouter)
    .route("/api", providerFallbacksRouter)

  app.use("/mcp", (c, next) => {
    return cors({
      origin: "*",
      allowHeaders: [
        "Content-Type",
        "Authorization",
        "X-API-Key",
        "Mcp-Session-Id",
        "MCP-Protocol-Version",
      ],
      allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
      maxAge: 86400,
    })(c, next)
  })

  app.all("/mcp", async (c) => {
    const authHeader = c.req.header("Authorization")
    const apiKeyHeader = c.req.header("X-API-Key")
    const rawKey =
      apiKeyHeader ??
      (authHeader?.startsWith("Bearer rk_") ? authHeader.slice(7) : null)

    if (!rawKey?.startsWith("rk_")) {
      return c.json(
        {
          error: {
            code: "unauthenticated",
            message: "API key required for MCP",
          },
        },
        401
      )
    }

    const baseUrl = new URL(c.req.url).origin
    const server = createMcpServer({ baseUrl, apiKey: rawKey })
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    })
    await server.connect(transport)
    return transport.handleRequest(c.req.raw)
  })

  app.doc("/doc", {
    openapi: "3.0.0",
    info: { title: "Renderical API", version: "1.0.0" },
  })

  app.get("/scalar", Scalar({ url: "/doc", title: "Renderical API" }))

  return routes
}
