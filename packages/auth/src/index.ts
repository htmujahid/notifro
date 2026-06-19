import { betterAuth } from "better-auth"
import { mockD1 } from "./mock"

export function createAuth(db: D1Database = mockD1) {
  return betterAuth({
    database: db,
    emailAndPassword: {
      enabled: true,
    },
  })
}

export const auth = createAuth()
