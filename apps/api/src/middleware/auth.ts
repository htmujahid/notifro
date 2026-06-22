import { createMiddleware } from "hono/factory"

import { Errors } from "../lib/errors"
import type { AppEnv } from "../lib/types"

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.var.user) throw Errors.unauthenticated()
  await next()
})
