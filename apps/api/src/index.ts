import { env } from 'cloudflare:workers'
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { cors } from 'hono/cors'
import { Scalar } from '@scalar/hono-api-reference'
import { createAuth, auth } from './lib/auth'

const authInstance = createAuth(env.DB)

const app = new OpenAPIHono<{
  Bindings: CloudflareBindings
  Variables: {
    user: typeof auth.$Infer.Session.user | null
    session: typeof auth.$Infer.Session.session | null
  }
}>()

app.use('/api/auth/*', (c, next) => {
  return cors({
    origin: c.env.FRONTEND_URL,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['POST', 'GET', 'OPTIONS'],
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

app.doc('/doc', {
  openapi: '3.0.0',
  info: { title: 'Renderical API', version: '1.0.0' },
})

app.get('/scalar', Scalar({ url: '/doc', title: 'Renderical API' }))

export default app
