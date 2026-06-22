import type { AppDB } from "../db/client"
import type { auth } from "./auth"

export type AppEnv = {
  Bindings: CloudflareBindings
  Variables: {
    user: typeof auth.$Infer.Session.user | null
    session: typeof auth.$Infer.Session.session | null
    db: AppDB
    apiKeyId: string | null
  }
}
