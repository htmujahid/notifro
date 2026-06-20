import type { auth } from './auth'
import type { AppDB } from '../db/client'
import type { OrgRole } from './organization'

export type AppEnv = {
  Bindings: CloudflareBindings
  Variables: {
    user: typeof auth.$Infer.Session.user | null
    session: typeof auth.$Infer.Session.session | null
    db: AppDB
    org: { id: string; role: OrgRole }
  }
}
