import { OpenAPIHono, z } from "@hono/zod-openapi"

import { Errors, validationHook } from "../lib/errors"
import { applyListQuery } from "../lib/list-query"
import type { AppEnv } from "../lib/types"
import { requireAuth } from "../middleware/auth"
import {
  CE_DEFAULT_SORT,
  CE_FILTERABLE,
  CE_SORTABLE,
  ConsentEventDtoSchema,
  SUPP_DEFAULT_SORT,
  SUPP_FILTERABLE,
  SUPP_SORTABLE,
  SuppressionDtoSchema,
  addSuppressionRoute,
  deleteSuppressionRoute,
  listConsentEventsRoute,
  listSuppressionsRoute,
} from "./compliance.contract"

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })
router.use("*", requireAuth)

export default router
  .openapi(listSuppressionsRoute, async (c) => {
    const parsed = c.req.valid("query")
    const userId = c.var.user!.id
    const baseQuery = c.var.db
      .selectFrom("suppression")
      .where("userId", "=", userId)
      .selectAll()
    const { qb, getPage } = applyListQuery(baseQuery, parsed, {
      sortable: SUPP_SORTABLE,
      filterable: SUPP_FILTERABLE,
      defaultSort: SUPP_DEFAULT_SORT,
    })
    const rows = await qb.execute()
    const page = getPage(rows as Record<string, unknown>[])
    return c.json({
      data: page.data as z.infer<typeof SuppressionDtoSchema>[],
      nextCursor: page.nextCursor,
    })
  })

  .openapi(addSuppressionRoute, async (c) => {
    const { channel, address, reason } = c.req.valid("json")
    const userId = c.var.user!.id
    const ts = new Date().toISOString()
    const id = crypto.randomUUID()

    await c.var.db
      .insertInto("suppression")
      .values({ id, userId, channel, address, reason, createdAt: ts })
      .onConflict((oc) => oc.doNothing())
      .execute()

    await c.var.db
      .insertInto("consent_event")
      .values({
        id: crypto.randomUUID(),
        userId,
        recipientId: null,
        channel,
        topicId: null,
        event: "opt_out",
        source: "api",
        actorNote: null,
        createdAt: ts,
      })
      .execute()

    const row = await c.var.db
      .selectFrom("suppression")
      .where("userId", "=", userId)
      .where("channel", "=", channel)
      .where("address", "=", address)
      .selectAll()
      .executeTakeFirstOrThrow()
    return c.json(row as z.infer<typeof SuppressionDtoSchema>, 201)
  })

  .openapi(deleteSuppressionRoute, async (c) => {
    const { id } = c.req.param()
    const userId = c.var.user!.id
    const row = await c.var.db
      .selectFrom("suppression")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .select("id")
      .executeTakeFirst()
    if (!row) throw Errors.notFound("Suppression")
    await c.var.db
      .deleteFrom("suppression")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .execute()
    return new Response(null, { status: 204 })
  })

  .openapi(listConsentEventsRoute, async (c) => {
    const parsed = c.req.valid("query")
    const userId = c.var.user!.id
    const baseQuery = c.var.db
      .selectFrom("consent_event")
      .where("userId", "=", userId)
      .selectAll()
    const { qb, getPage } = applyListQuery(baseQuery, parsed, {
      sortable: CE_SORTABLE,
      filterable: CE_FILTERABLE,
      defaultSort: CE_DEFAULT_SORT,
    })
    const rows = await qb.execute()
    const page = getPage(rows as Record<string, unknown>[])
    return c.json({
      data: page.data as z.infer<typeof ConsentEventDtoSchema>[],
      nextCursor: page.nextCursor,
    })
  })
