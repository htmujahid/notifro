import { Hono } from "hono"

import { verifyTrackingToken } from "../lib/tracking"
import type { AppEnv } from "../lib/types"

const TRANSPARENT_GIF = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00,
  0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00,
  0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02,
  0x44, 0x01, 0x00, 0x3b,
])

const router = new Hono<AppEnv>()

router.get("/o/:token", async (c) => {
  const rawToken = c.req.param("token").replace(/\.gif$/i, "")
  const secret = c.env.CONNECTION_ENC_KEY

  if (secret) {
    const claims = await verifyTrackingToken(rawToken, secret)
    if (claims && claims.t === "open") {
      const db = c.var.db
      const ts = new Date().toISOString()
      const delivery = await db
        .selectFrom("delivery")
        .where("id", "=", claims.d)
        .select(["userId", "openedAt"])
        .executeTakeFirst()
      if (delivery && !delivery.openedAt) {
        await db
          .updateTable("delivery")
          .set({ openedAt: ts, updatedAt: ts })
          .where("id", "=", claims.d)
          .execute()
        await db
          .insertInto("delivery_event")
          .values({
            id: crypto.randomUUID(),
            deliveryId: claims.d,
            userId: delivery.userId,
            type: "opened",
            at: ts,
            meta: "{}",
          })
          .execute()
      }
    }
  }

  return new Response(TRANSPARENT_GIF, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache",
      Pragma: "no-cache",
    },
  })
})

router.get("/c/:token", async (c) => {
  const token = c.req.param("token")
  const secret = c.env.CONNECTION_ENC_KEY

  if (secret) {
    const claims = await verifyTrackingToken(token, secret)
    if (claims && claims.t === "click" && claims.u) {
      const db = c.var.db
      const ts = new Date().toISOString()
      const delivery = await db
        .selectFrom("delivery")
        .where("id", "=", claims.d)
        .select(["userId"])
        .executeTakeFirst()
      if (delivery) {
        await db
          .updateTable("delivery")
          .set({ clickedAt: ts, updatedAt: ts })
          .where("id", "=", claims.d)
          .execute()
        await db
          .insertInto("delivery_event")
          .values({
            id: crypto.randomUUID(),
            deliveryId: claims.d,
            userId: delivery.userId,
            type: "clicked",
            at: ts,
            meta: JSON.stringify({ url: claims.u }),
          })
          .execute()
      }
      return Response.redirect(claims.u, 302)
    }
  }

  return new Response("Invalid link", { status: 400 })
})

export default router
