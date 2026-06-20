import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { cors } from 'hono/cors'
import { Scalar } from '@scalar/hono-api-reference'
import { authInstance } from './lib/auth'
import { db } from './db/client'
import { ApiError, validationHook } from './lib/errors'
import type { AppEnv } from './lib/types'
import templateRouter from './routes/_template'

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
  organizationCount: z.number().openapi({ example: 1 }),
})

const dbHealthRoute = createRoute({
  method: 'get',
  path: '/api/_db/health',
  responses: {
    200: {
      content: { 'application/json': { schema: DbHealthResponseSchema } },
      description: 'Returns organization count via Kysely to verify D1 dialect wiring',
    },
  },
})

app.openapi(dbHealthRoute, async (c) => {
  const result = await c.var.db
    .selectFrom('organization')
    .select(c.var.db.fn.countAll<number>().as('n'))
    .executeTakeFirstOrThrow()
  return c.json({ organizationCount: Number(result.n) })
})

app.route('/api', templateRouter)

app.doc('/doc', {
  openapi: '3.0.0',
  info: { title: 'Renderical API', version: '1.0.0' },
})

app.get('/scalar', Scalar({ url: '/doc', title: 'Renderical API' }))

export default app
