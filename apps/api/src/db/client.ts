import { Kysely } from 'kysely'
import { D1Dialect } from 'kysely-d1'
import type { DB } from './schema'

export const db = (d1: D1Database) => new Kysely<DB>({ dialect: new D1Dialect({ database: d1 }) })

export type AppDB = ReturnType<typeof db>
