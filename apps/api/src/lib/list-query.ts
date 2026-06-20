import { z } from '@hono/zod-openapi'
import { Errors } from './errors'

export type SortableMap = Record<string, string>

export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'like'
  | 'not_like'
  | 'in'
  | 'not_in'

export type FilterSpec = Record<string, {
  column: string
  schema: z.ZodTypeAny
  operator: FilterOperator
}>

export interface ListQueryConfig {
  sortable: SortableMap
  filterable: FilterSpec
  defaultSort: { key: string; order: 'asc' | 'desc' }
}

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  offset: z.coerce.number().int().min(0).optional(),
  page: z.coerce.number().int().min(1).optional(),
})

export function listQuerySchema(config: ListQueryConfig) {
  const sortKeys = Object.keys(config.sortable) as [string, ...string[]]
  const filterEntries = Object.entries(config.filterable).reduce(
    (acc, [key, spec]) => ({ ...acc, [key]: spec.schema.optional() }),
    {} as Record<string, z.ZodTypeAny>,
  )
  return paginationSchema.extend({
    sort: z.enum(sortKeys).optional(),
    order: z.enum(['asc', 'desc']).optional(),
    ...filterEntries,
  }).strict()
}

export type ParsedListQuery = z.infer<ReturnType<typeof listQuerySchema>>

type CursorPayload = { v: unknown; id: string }

function encodeCursor(payload: CursorPayload): string {
  return btoa(JSON.stringify(payload))
}

function decodeCursor(cursor: string): CursorPayload {
  try {
    const raw = JSON.parse(atob(cursor))
    if (typeof raw !== 'object' || raw === null || !('v' in raw) || !('id' in raw)) {
      throw Errors.validationError('Invalid cursor')
    }
    return raw as CursorPayload
  } catch {
    throw Errors.validationError('Malformed cursor')
  }
}

export function applyListQuery<T>(
  qb: T,
  parsed: Record<string, unknown>,
  config: ListQueryConfig,
) {
  const limit = (parsed.limit as number) ?? 20
  const cursor = parsed.cursor as string | undefined
  const offset = parsed.offset as number | undefined
  const sortKey = (parsed.sort as string | undefined) ?? config.defaultSort.key
  const order = (parsed.order as 'asc' | 'desc' | undefined) ?? config.defaultSort.order

  const sortCol = config.sortable[sortKey]
  if (!sortCol) throw Errors.validationError(`Unknown sort key: ${sortKey}`)

  let builder = qb as any

  for (const [paramKey, spec] of Object.entries(config.filterable)) {
    const value = parsed[paramKey]
    if (value === undefined || value === null || value === '') continue
    const col = spec.column
    if (spec.operator === 'eq')       builder = builder.where(col, '=',        value)
    else if (spec.operator === 'neq') builder = builder.where(col, '!=',       value)
    else if (spec.operator === 'gt')  builder = builder.where(col, '>',        value)
    else if (spec.operator === 'gte') builder = builder.where(col, '>=',       value)
    else if (spec.operator === 'lt')  builder = builder.where(col, '<',        value)
    else if (spec.operator === 'lte') builder = builder.where(col, '<=',       value)
    else if (spec.operator === 'like')     builder = builder.where(col, 'like',     `%${value}%`)
    else if (spec.operator === 'not_like') builder = builder.where(col, 'not like', `%${value}%`)
    else if (spec.operator === 'in' || spec.operator === 'not_in') {
      const vals = Array.isArray(value) ? value : String(value).split(',').map((v) => v.trim())
      builder = builder.where(col, spec.operator === 'in' ? 'in' : 'not in', vals)
    }
  }

  if (cursor) {
    const { v, id } = decodeCursor(cursor)
    if (order === 'asc') {
      builder = builder.where((eb: any) =>
        eb.or([
          eb(sortCol, '>', v),
          eb.and([eb(sortCol, '=', v), eb('id', '>', id)]),
        ]),
      )
    } else {
      builder = builder.where((eb: any) =>
        eb.or([
          eb(sortCol, '<', v),
          eb.and([eb(sortCol, '=', v), eb('id', '<', id)]),
        ]),
      )
    }
  } else if (typeof offset === 'number') {
    builder = builder.offset(offset)
  }

  builder = builder.orderBy(sortCol, order).orderBy('id', order).limit(limit + 1)

  function getPage<R extends Record<string, unknown>>(rows: R[]) {
    const hasMore = rows.length > limit
    const data = hasMore ? rows.slice(0, limit) : rows
    const last = data[data.length - 1]
    const nextCursor =
      hasMore && last
        ? encodeCursor({ v: last[sortCol.split('.').pop()!] ?? last[sortKey], id: last.id as string })
        : null
    return { data, nextCursor }
  }

  return { qb: builder as T, getPage }
}
