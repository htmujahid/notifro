import { env } from "cloudflare:workers"
import { createAuth } from "@workspace/auth"

export const auth = createAuth(env.DB)