import { OpenAPIHono, z } from "@hono/zod-openapi"

import { Errors, validationHook } from "../lib/errors"
import {
  signPreferenceToken,
  verifyPreferenceToken,
} from "../lib/preference-token"
import { recordConsentEvent, suppress } from "../lib/suppress"
import type { AppEnv } from "../lib/types"
import { requireAuth } from "../middleware/auth"
import {
  adminSetPreferenceRoute,
  channelPriorityRoute,
  ChannelPriorityDtoSchema,
  generateTokenRoute,
  prefCenterGetRoute,
  prefCenterPostRoute,
  PreferenceDtoSchema,
  recipientPrefsRoute,
  setChannelPriorityRoute,
  unsubscribeGetRoute,
  unsubscribePostRoute,
} from "./preferences.contract"

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000

function now(): string {
  return new Date().toISOString()
}

async function getSecret(env: CloudflareBindings): Promise<string | null> {
  return env.CONNECTION_ENC_KEY ?? null
}

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })

const authedRouter = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })
authedRouter.use("*", requireAuth)

const authedRoutes = authedRouter
  .openapi(generateTokenRoute, async (c) => {
    const { recipientId } = c.req.valid("json")
    const userId = c.var.user!.id
    const secret = await getSecret(c.env)
    if (!secret) throw Errors.internal()

    const recipient = await c.var.db
      .selectFrom("recipient")
      .where("id", "=", recipientId)
      .where("userId", "=", userId)
      .select("id")
      .executeTakeFirst()

    if (!recipient) throw Errors.notFound("Recipient")

    const exp = Date.now() + TOKEN_TTL_MS
    const token = await signPreferenceToken(
      { recipientId, userId, exp },
      secret
    )
    return c.json({ token, expiresAt: new Date(exp).toISOString() })
  })

  .openapi(recipientPrefsRoute, async (c) => {
    const { id } = c.req.param()
    const userId = c.var.user!.id

    const recipient = await c.var.db
      .selectFrom("recipient")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .select("id")
      .executeTakeFirst()
    if (!recipient) throw Errors.notFound("Recipient")

    const prefs = await c.var.db
      .selectFrom("preference")
      .where("recipientId", "=", id)
      .where("userId", "=", userId)
      .selectAll()
      .execute()

    return c.json({ data: prefs as z.infer<typeof PreferenceDtoSchema>[] })
  })

  .openapi(adminSetPreferenceRoute, async (c) => {
    const { id } = c.req.param()
    const { preferences } = c.req.valid("json")
    const userId = c.var.user!.id
    const ts = now()

    const recipient = await c.var.db
      .selectFrom("recipient")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .select("id")
      .executeTakeFirst()
    if (!recipient) throw Errors.notFound("Recipient")

    for (const pref of preferences) {
      const existing = await c.var.db
        .selectFrom("preference")
        .where("recipientId", "=", id)
        .where("channel", "=", pref.channel)
        .where((eb) =>
          pref.topicId
            ? eb("topicId", "=", pref.topicId)
            : eb("topicId", "is", null)
        )
        .select("id")
        .executeTakeFirst()

      if (existing) {
        await c.var.db
          .updateTable("preference")
          .set({
            optedIn: pref.optedIn ? 1 : 0,
            source: "admin",
            updatedAt: ts,
          })
          .where("id", "=", existing.id)
          .execute()
      } else {
        await c.var.db
          .insertInto("preference")
          .values({
            id: crypto.randomUUID(),
            userId,
            recipientId: id,
            channel: pref.channel,
            topicId: pref.topicId ?? null,
            optedIn: pref.optedIn ? 1 : 0,
            source: "admin",
            createdAt: ts,
            updatedAt: ts,
          })
          .execute()
      }
    }

    return c.json({ updated: preferences.length })
  })

  .openapi(channelPriorityRoute, async (c) => {
    const { id } = c.req.param()
    const userId = c.var.user!.id

    const recipient = await c.var.db
      .selectFrom("recipient")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .select("id")
      .executeTakeFirst()
    if (!recipient) throw Errors.notFound("Recipient")

    const cp = await c.var.db
      .selectFrom("channel_priority")
      .where("recipientId", "=", id)
      .where("userId", "=", userId)
      .selectAll()
      .executeTakeFirst()

    if (!cp) throw Errors.notFound("Channel priority")
    return c.json({ ...cp, order: JSON.parse(cp.order) as string[] } as z.infer<
      typeof ChannelPriorityDtoSchema
    >)
  })

  .openapi(setChannelPriorityRoute, async (c) => {
    const { id } = c.req.param()
    const { order } = c.req.valid("json")
    const userId = c.var.user!.id
    const ts = now()

    const recipient = await c.var.db
      .selectFrom("recipient")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .select("id")
      .executeTakeFirst()
    if (!recipient) throw Errors.notFound("Recipient")

    const existing = await c.var.db
      .selectFrom("channel_priority")
      .where("recipientId", "=", id)
      .where("userId", "=", userId)
      .select("id")
      .executeTakeFirst()

    if (existing) {
      await c.var.db
        .updateTable("channel_priority")
        .set({ order: JSON.stringify(order), updatedAt: ts })
        .where("id", "=", existing.id)
        .execute()
      const updated = await c.var.db
        .selectFrom("channel_priority")
        .where("id", "=", existing.id)
        .selectAll()
        .executeTakeFirstOrThrow()
      return c.json({
        ...updated,
        order: JSON.parse(updated.order) as string[],
      } as z.infer<typeof ChannelPriorityDtoSchema>)
    }

    const newId = crypto.randomUUID()
    await c.var.db
      .insertInto("channel_priority")
      .values({
        id: newId,
        userId,
        recipientId: id,
        order: JSON.stringify(order),
        createdAt: ts,
        updatedAt: ts,
      })
      .execute()

    const created = await c.var.db
      .selectFrom("channel_priority")
      .where("id", "=", newId)
      .selectAll()
      .executeTakeFirstOrThrow()
    return c.json({
      ...created,
      order: JSON.parse(created.order) as string[],
    } as z.infer<typeof ChannelPriorityDtoSchema>)
  })

const publicRouter = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })

async function verifyToken(c: { env: CloudflareBindings }, token: string) {
  const secret = await getSecret(c.env)
  if (!secret) return null
  return verifyPreferenceToken(token, secret)
}

const publicRoutes = publicRouter
  .openapi(prefCenterGetRoute, async (c) => {
    const { token } = c.req.valid("query")
    const claims = await verifyToken(c, token)
    if (!claims) throw Errors.unauthenticated()

    const { recipientId, userId } = claims

    const topics = await c.var.db
      .selectFrom("topic")
      .where("userId", "=", userId)
      .selectAll()
      .execute()

    const prefs = await c.var.db
      .selectFrom("preference")
      .where("recipientId", "=", recipientId)
      .selectAll()
      .execute()

    const prefMap = new Map(
      prefs.map((p) => [`${p.channel}:${p.topicId ?? ""}`, p.optedIn])
    )

    const ALL_CHANNELS = [
      "email",
      "sms",
      "push",
      "in_app",
      "slack",
      "discord",
      "teams",
      "telegram",
      "whatsapp",
    ]

    const topicData = topics.map((t) => ({
      topicId: t.id,
      key: t.key,
      name: t.name,
      description: t.description,
      transactional: t.transactional,
      channels: ALL_CHANNELS.map((ch) => {
        const explicit = prefMap.get(`${ch}:${t.id}`)
        return {
          channel: ch,
          optedIn: explicit !== undefined ? !!explicit : !!t.defaultOptIn,
        }
      }),
    }))

    const globalOptOut = ALL_CHANNELS.filter((ch) => {
      const pref = prefMap.get(`${ch}:`)
      return pref !== undefined && !pref
    })

    return c.json({ recipientId, topics: topicData, globalOptOut })
  })

  .openapi(prefCenterPostRoute, async (c) => {
    const { token } = c.req.valid("query")
    const { preferences } = c.req.valid("json")
    const claims = await verifyToken(c, token)
    if (!claims) throw Errors.unauthenticated()

    const { recipientId, userId } = claims
    const ts = now()

    for (const pref of preferences) {
      const existing = await c.var.db
        .selectFrom("preference")
        .where("recipientId", "=", recipientId)
        .where("channel", "=", pref.channel)
        .where((eb) =>
          pref.topicId
            ? eb("topicId", "=", pref.topicId)
            : eb("topicId", "is", null)
        )
        .select("id")
        .executeTakeFirst()

      if (existing) {
        await c.var.db
          .updateTable("preference")
          .set({
            optedIn: pref.optedIn ? 1 : 0,
            source: "preference_center",
            updatedAt: ts,
          })
          .where("id", "=", existing.id)
          .execute()
      } else {
        await c.var.db
          .insertInto("preference")
          .values({
            id: crypto.randomUUID(),
            userId,
            recipientId,
            channel: pref.channel,
            topicId: pref.topicId ?? null,
            optedIn: pref.optedIn ? 1 : 0,
            source: "preference_center",
            createdAt: ts,
            updatedAt: ts,
          })
          .execute()
      }

      await recordConsentEvent(
        c.var.db,
        userId,
        pref.channel,
        pref.optedIn ? "opt_in" : "opt_out",
        "preference_center",
        recipientId,
        pref.topicId ?? null
      )
    }

    return c.json({ updated: preferences.length })
  })

  .openapi(unsubscribeGetRoute, async (c) => {
    const { token } = c.req.valid("query")
    const claims = await verifyToken(c, token)
    if (!claims) throw Errors.unauthenticated()

    const { recipientId } = claims
    const recipient = await c.var.db
      .selectFrom("recipient")
      .where("id", "=", recipientId)
      .select(["id", "email"])
      .executeTakeFirst()

    return c.json({ recipientId, email: recipient?.email ?? null, ok: true })
  })

  .openapi(unsubscribePostRoute, async (c) => {
    const { token } = c.req.valid("query")
    const claims = await verifyToken(c, token)
    if (!claims) throw Errors.unauthenticated()

    const { recipientId, userId } = claims
    const ts = now()

    const ALL_CHANNELS = [
      "email",
      "sms",
      "push",
      "in_app",
      "slack",
      "discord",
      "teams",
      "telegram",
      "whatsapp",
      "web_push",
      "mobile_push",
      "webhook",
    ]

    for (const channel of ALL_CHANNELS) {
      const existing = await c.var.db
        .selectFrom("preference")
        .where("recipientId", "=", recipientId)
        .where("channel", "=", channel)
        .where("topicId", "is", null)
        .select("id")
        .executeTakeFirst()

      if (existing) {
        await c.var.db
          .updateTable("preference")
          .set({ optedIn: 0, source: "unsubscribe_link", updatedAt: ts })
          .where("id", "=", existing.id)
          .execute()
      } else {
        await c.var.db
          .insertInto("preference")
          .values({
            id: crypto.randomUUID(),
            userId,
            recipientId,
            channel,
            topicId: null,
            optedIn: 0,
            source: "unsubscribe_link",
            createdAt: ts,
            updatedAt: ts,
          })
          .execute()
      }
    }

    const recipient = await c.var.db
      .selectFrom("recipient")
      .where("id", "=", recipientId)
      .select("email")
      .executeTakeFirst()

    if (recipient?.email) {
      await suppress(
        c.var.db,
        userId,
        "email",
        recipient.email,
        "unsubscribe",
        recipientId
      )
    }

    return c.json({ ok: true })
  })

export default router.route("", authedRoutes).route("", publicRoutes)
