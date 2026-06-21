import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { requireAuth } from '../middleware/auth'
import { listQuerySchema, applyListQuery } from '../lib/list-query'
import { validationHook } from '../lib/errors'
import type { AppEnv } from '../lib/types'

const SORTABLE = { createdAt: 'createdAt' }
const FILTERABLE = {
  method: { column: 'method', schema: z.string(), operator: 'eq' as const },
  status: { column: 'status', schema: z.coerce.number().int(), operator: 'eq' as const },
  path: { column: 'path', schema: z.string(), operator: 'like' as const },
}
const DEFAULT_SORT = { key: 'createdAt', order: 'desc' as const }

const ApiRequestLogDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  apiKeyId: z.string().nullable(),
  method: z.string(),
  path: z.string(),
  status: z.number(),
  latencyMs: z.number().nullable(),
  createdAt: z.string(),
})

const ListResponseSchema = z.object({
  data: z.array(ApiRequestLogDtoSchema),
  nextCursor: z.string().nullable(),
})

const listRoute = createRoute({
  method: 'get',
  path: '/request-log',
  request: {
    query: listQuerySchema({ sortable: SORTABLE, filterable: FILTERABLE, defaultSort: DEFAULT_SORT }),
  },
  responses: {
    200: { content: { 'application/json': { schema: ListResponseSchema } }, description: 'Paginated request log' },
  },
})

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })

router.use('/request-log', requireAuth)

router.openapi(listRoute, async (c) => {
  const parsed = c.req.valid('query')
  const userId = c.var.user!.id
  const db = c.var.db

  const baseQuery = db.selectFrom('api_request_log').where('userId', '=', userId).selectAll()

  const { qb, getPage } = applyListQuery(baseQuery, parsed, {
    sortable: SORTABLE,
    filterable: FILTERABLE,
    defaultSort: DEFAULT_SORT,
  })

  const rows = await qb.execute()
  const page = getPage(rows as Record<string, unknown>[])

  return c.json({ data: page.data as z.infer<typeof ApiRequestLogDtoSchema>[], nextCursor: page.nextCursor })
})

export default router
