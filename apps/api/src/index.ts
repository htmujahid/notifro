import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { cors } from 'hono/cors'
import { Scalar } from '@scalar/hono-api-reference'
import { authInstance } from './lib/auth'
import { db } from './db/client'
import { ApiError, validationHook } from './lib/errors'
import type { AppEnv } from './lib/types'
import templateRouter from './routes/_template'
import connectionsRouter from './routes/connections'
import notificationsRouter from './routes/notifications'
import templatesRouter from './routes/templates'
import inboxRouter from './routes/inbox'
import overviewRouter from './routes/overview'
import pushRouter from './routes/push'
import webhooksRouter from './routes/webhooks'
import devicesRouter from './routes/devices'
import deliveriesRouter from './routes/deliveries'
import trackingRouter from './routes/tracking'
import receiptsRouter from './routes/receipts'
import schedulesRouter from './routes/schedules'
import recipientProfilesRouter from './routes/recipient-profiles'
import recurringRouter from './routes/recurring'
import templateVersionsRouter from './routes/template-versions'
import snippetsRouter from './routes/snippets'
import brandKitRouter from './routes/brand-kit'
import recipientsRouter from './routes/recipients'
import segmentsRouter from './routes/segments'
import topicsRouter from './routes/topics'
import preferencesRouter from './routes/preferences'
import routingRouter from './routes/routing'
import chainsRouter from './routes/chains'
import rateLimitsRouter from './routes/rate-limits'
import keysRouter from './routes/keys'
import requestLogRouter from './routes/request-log'
import mcpRouter from './routes/mcp'
import analyticsRouter from './routes/analytics'
import complianceRouter from './routes/compliance'
import journeysRouter from './routes/journeys'
import eventsRouter from './routes/events'
import providerFallbacksRouter from './routes/provider-fallbacks'
import { redactPii } from './lib/redact'
import { createMcpServer, WebStandardStreamableHTTPServerTransport } from '@workspace/mcp'
import { handleDeliveryQueue } from './queue/consumer'
import { handleScheduledSweep } from './scheduling/sweep'
import './channels/email'
import './channels/in-app'
import './channels/web-push/adapter'
import './channels/webhook/adapter'
import './channels/sms'
import './channels/whatsapp'
import './channels/telegram'
import './channels/slack'
import './channels/discord'
import './channels/teams'
import './channels/mobile-push/adapter'

const app = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })

app.onError((err, c) => {
  if (err instanceof ApiError) {
    return c.json(
      { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } },
      err.httpStatus as 400 | 401 | 403 | 404 | 422 | 500,
    )
  }
  console.error(err)
  return c.json({ error: { code: 'internal_error', message: 'Internal server error' } }, 500)
})

app.use('*', async (c, next) => {
  c.set('db', db(c.env.DB))
  await next()
})

app.use('/api/*', (c, next) => {
  return cors({
    origin: c.env.FRONTEND_URL,
    allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Renderical-Sandbox'],
    allowMethods: ['POST', 'GET', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  })(c, next)
})

app.use('*', async (c, next) => {
  c.set('sandboxMode', false)
  c.set('apiKeyId', null)

  const authHeader = c.req.header('Authorization')
  const apiKeyHeader = c.req.header('X-API-Key')
  const rawKey = apiKeyHeader ?? (authHeader?.startsWith('Bearer rk_') ? authHeader.slice(7) : null)

  if (rawKey?.startsWith('rk_')) {
    const verified = await authInstance.api.verifyApiKey({ body: { key: rawKey } })
    if (verified.valid && verified.key) {
      const apiKey = verified.key
      const dbUser = await c.var.db
        .selectFrom('user')
        .where('id', '=', apiKey.referenceId)
        .selectAll()
        .executeTakeFirst()
      if (dbUser) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        c.set('user', dbUser as any)
        c.set('session', null)
        const meta = apiKey.metadata as { mode?: string } | null
        c.set('sandboxMode', meta?.mode === 'test' || c.req.header('X-Renderical-Sandbox') === 'true')
        c.set('apiKeyId', apiKey.id)
        await next()
        return
      }
    }
  }

  c.set('sandboxMode', c.req.header('X-Renderical-Sandbox') === 'true')

  const session = await authInstance.api.getSession({ headers: c.req.raw.headers })
  if (!session) {
    c.set('user', null)
    c.set('session', null)
  } else {
    c.set('user', session.user)
    c.set('session', session.session)
  }
  await next()
})

app.use('/api/*', async (c, next) => {
  const start = Date.now()
  await next()
  const userId = c.var.user?.id
  if (userId && !c.req.path.includes('/api/request-log') && !c.req.path.includes('/api/auth/')) {
    const ms = Date.now() - start
    c.var.db
      .insertInto('api_request_log')
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

app.on(['POST', 'GET'], '/api/auth/*', (c) => {
  return authInstance.handler(c.req.raw)
})

app.get('/health', async (c) => {
  const ts = new Date().toISOString()
  try {
    await c.var.db.selectFrom('user').select(c.var.db.fn.countAll<number>().as('n')).executeTakeFirstOrThrow()
    return c.json({ status: 'ok', db: 'ok', queue: 'ok', ts })
  } catch {
    return c.json({ status: 'error', db: 'error', queue: 'ok', ts }, 503)
  }
})

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

const HelloResponseSchema = z.object({
  message: z.string().openapi({ example: 'Hello, World!' }),
})

const helloRoute = createRoute({
  method: 'get',
  path: '/api/hello',
  responses: {
    200: {
      content: { 'application/json': { schema: HelloResponseSchema } },
      description: 'Returns a hello message',
    },
  },
})

app.openapi(helloRoute, (c) => {
  return c.json({ message: 'Hello, World!' })
})

const DbHealthResponseSchema = z.object({
  userCount: z.number().openapi({ example: 1 }),
})

const dbHealthRoute = createRoute({
  method: 'get',
  path: '/api/_db/health',
  responses: {
    200: {
      content: { 'application/json': { schema: DbHealthResponseSchema } },
      description: 'Returns user count via Kysely to verify D1 dialect wiring',
    },
  },
})

app.openapi(dbHealthRoute, async (c) => {
  const result = await c.var.db
    .selectFrom('user')
    .select(c.var.db.fn.countAll<number>().as('n'))
    .executeTakeFirstOrThrow()
  return c.json({ userCount: Number(result.n) })
})

app.route('/api', templateRouter)
app.route('/api', connectionsRouter)
app.route('/api', notificationsRouter)
app.route('/api', templatesRouter)
app.route('/api', inboxRouter)
app.route('/api', overviewRouter)
app.route('/api', pushRouter)
app.route('/api', webhooksRouter)
app.route('/api', devicesRouter)
app.route('/api', deliveriesRouter)
app.route('/t', trackingRouter)
app.route('/webhooks', receiptsRouter)
app.route('/api', schedulesRouter)
app.route('/api', recipientProfilesRouter)
app.route('/api', recurringRouter)
app.route('/api', templateVersionsRouter)
app.route('/api', snippetsRouter)
app.route('/api', brandKitRouter)
app.route('/api', recipientsRouter)
app.route('/api', segmentsRouter)
app.route('/api', topicsRouter)
app.route('/api', preferencesRouter)
app.route('/api', routingRouter)
app.route('/api', chainsRouter)
app.route('/api', rateLimitsRouter)
app.route('/api', keysRouter)
app.route('/api', requestLogRouter)
app.route('/api', mcpRouter)
app.route('/api', analyticsRouter)
app.route('/api', complianceRouter)
app.route('/api', journeysRouter)
app.route('/api', eventsRouter)
app.route('/api', providerFallbacksRouter)

app.use('/mcp', (c, next) => {
  return cors({
    origin: '*',
    allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'Mcp-Session-Id', 'MCP-Protocol-Version'],
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    maxAge: 86400,
  })(c, next)
})

app.all('/mcp', async (c) => {
  const authHeader = c.req.header('Authorization')
  const apiKeyHeader = c.req.header('X-API-Key')
  const rawKey = apiKeyHeader ?? (authHeader?.startsWith('Bearer rk_') ? authHeader.slice(7) : null)

  if (!rawKey?.startsWith('rk_')) {
    return c.json({ error: { code: 'unauthenticated', message: 'API key required for MCP' } }, 401)
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

app.doc('/doc', {
  openapi: '3.0.0',
  info: { title: 'Renderical API', version: '1.0.0' },
})

app.get('/scalar', Scalar({ url: '/doc', title: 'Renderical API' }))

export default {
  fetch: app.fetch.bind(app),
  async queue(batch: MessageBatch<import('./queue/consumer').DeliveryQueueMessage>, env: CloudflareBindings) {
    await handleDeliveryQueue(batch, env)
  },
  async scheduled(_event: ScheduledEvent, env: CloudflareBindings, _ctx: ExecutionContext) {
    await handleScheduledSweep(env)
  },
}
