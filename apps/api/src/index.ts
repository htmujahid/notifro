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
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['POST', 'GET', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  })(c, next)
})

app.use('*', async (c, next) => {
  const session = await authInstance.api.getSession({ headers: c.req.raw.headers })
  if (!session) {
    c.set('user', null)
    c.set('session', null)
    await next()
    return
  }
  c.set('user', session.user)
  c.set('session', session.session)
  await next()
})

app.on(['POST', 'GET'], '/api/auth/*', (c) => {
  return authInstance.handler(c.req.raw)
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
