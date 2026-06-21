import { sql } from 'kysely'
import type { AppDB } from '../db/client'

export type FilterOp = 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in'

export type FilterClause = {
  field: string
  op: FilterOp
  value: string | number | boolean | null | (string | number)[]
}

export type FilterNode =
  | { and: FilterNode[] }
  | { or: FilterNode[] }
  | FilterClause

const MAX_DEPTH = 5

function buildSql(node: FilterNode, depth = 0): ReturnType<typeof sql<boolean>> {
  if (depth > MAX_DEPTH) return sql<boolean>`0`

  if ('and' in node) {
    if ((node as { and: FilterNode[] }).and.length === 0) return sql<boolean>`1`
    const parts = (node as { and: FilterNode[] }).and.map((n) => buildSql(n, depth + 1))
    return sql<boolean>`(${sql.join(parts, sql` AND `)})`
  }

  if ('or' in node) {
    if ((node as { or: FilterNode[] }).or.length === 0) return sql<boolean>`0`
    const parts = (node as { or: FilterNode[] }).or.map((n) => buildSql(n, depth + 1))
    return sql<boolean>`(${sql.join(parts, sql` OR `)})`
  }

  const c = node as FilterClause
  const safeField = String(c.field).replace(/[^a-zA-Z0-9_.]/g, '').slice(0, 64)
  if (!safeField) return sql<boolean>`0`
  const path = `$.${safeField}`
  const val = c.value

  switch (c.op) {
    case 'eq':
      return sql<boolean>`json_extract(attributes, ${path}) = ${val}`
    case 'neq':
      return sql<boolean>`json_extract(attributes, ${path}) != ${val}`
    case 'gt':
      return sql<boolean>`json_extract(attributes, ${path}) > ${val}`
    case 'lt':
      return sql<boolean>`json_extract(attributes, ${path}) < ${val}`
    case 'gte':
      return sql<boolean>`json_extract(attributes, ${path}) >= ${val}`
    case 'lte':
      return sql<boolean>`json_extract(attributes, ${path}) <= ${val}`
    case 'contains':
      return sql<boolean>`json_extract(attributes, ${path}) like ${'%' + String(val) + '%'}`
    case 'in': {
      const vals = Array.isArray(val) ? val : [val]
      if (vals.length === 0) return sql<boolean>`0`
      return sql<boolean>`json_extract(attributes, ${path}) in (${sql.join(vals.map((v) => sql`${v}`))})`
    }
    default:
      return sql<boolean>`0`
  }
}

export type ResolvedRecipient = {
  id: string
  email: string | null
  phone: string | null
  locale: string | null
  timezone: string | null
  attributes: Record<string, unknown>
}

export async function resolveSegment(db: AppDB, userId: string, segmentId: string): Promise<ResolvedRecipient[]> {
  const segment = await db
    .selectFrom('segment')
    .where('id', '=', segmentId)
    .where('userId', '=', userId)
    .select('filter')
    .executeTakeFirst()

  if (!segment) return []

  let filter: FilterNode
  try {
    filter = JSON.parse(segment.filter) as FilterNode
  } catch {
    return []
  }

  const clause = buildSql(filter)

  const rows = await db
    .selectFrom('recipient')
    .where('userId', '=', userId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .where(clause as any)
    .select(['id', 'email', 'phone', 'locale', 'timezone', 'attributes'])
    .execute()

  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    phone: r.phone,
    locale: r.locale,
    timezone: r.timezone,
    attributes: r.attributes ? (JSON.parse(r.attributes) as Record<string, unknown>) : {},
  }))
}

export async function previewSegment(
  db: AppDB,
  userId: string,
  filter: FilterNode,
): Promise<{ count: number; sample: { id: string; email: string | null }[] }> {
  const clause = buildSql(filter)

  const [countRow, sampleRows] = await Promise.all([
    db
      .selectFrom('recipient')
      .where('userId', '=', userId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .where(clause as any)
      .select(db.fn.countAll<number>().as('n'))
      .executeTakeFirst(),
    db
      .selectFrom('recipient')
      .where('userId', '=', userId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .where(clause as any)
      .select(['id', 'email'])
      .limit(100)
      .execute(),
  ])

  return {
    count: Number(countRow?.n ?? 0),
    sample: sampleRows,
  }
}

export async function assignVariant<T extends { id: string; weight: number }>(
  notificationId: string,
  recipientId: string,
  variants: T[],
): Promise<T> {
  const key = `${notificationId}:${recipientId}`
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(key))
  const bytes = new Uint8Array(hashBuffer)
  const uint32 = (((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0)
  const totalWeight = variants.reduce((s, v) => s + v.weight, 0)
  const slot = uint32 % totalWeight

  let cumulative = 0
  for (const v of variants) {
    cumulative += v.weight
    if (slot < cumulative) return v
  }
  return variants[variants.length - 1]
}
