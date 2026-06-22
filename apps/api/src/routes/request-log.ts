import { OpenAPIHono, z } from "@hono/zod-openapi"

import { validationHook } from "../lib/errors"
import { applyListQuery } from "../lib/list-query"
import type { AppEnv } from "../lib/types"
import { requireAuth } from "../middleware/auth"
import {
  ApiRequestLogDtoSchema,
  DEFAULT_SORT,
  FILTERABLE,
  SORTABLE,
  listRoute,
} from "./request-log.contract"

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })

router.use("/request-log", requireAuth)

export default router.openapi(listRoute, async (c) => {
  const parsed = c.req.valid("query")
  const userId = c.var.user!.id
  const db = c.var.db

  const baseQuery = db
    .selectFrom("api_request_log")
    .where("userId", "=", userId)
    .selectAll()

  const { qb, getPage } = applyListQuery(baseQuery, parsed, {
    sortable: SORTABLE,
    filterable: FILTERABLE,
    defaultSort: DEFAULT_SORT,
  })

  const rows = await qb.execute()
  const page = getPage(rows as Record<string, unknown>[])

  return c.json({
    data: page.data as z.infer<typeof ApiRequestLogDtoSchema>[],
    nextCursor: page.nextCursor,
  })
})
