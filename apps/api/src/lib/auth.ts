import { betterAuth } from 'better-auth'
import { sendVerificationEmail, sendResetPasswordEmail } from '@workspace/mailer'
import { mockD1 } from './mock-db'

const FROM = { email: 'noreply@renderical.com', name: 'Renderical' }

export function createAuth(db: D1Database = mockD1) {
  return betterAuth({
    database: db,
    emailAndPassword: {
      enabled: true,
      sendVerificationEmail: async ({ user, url }: { user: { email: string; name?: string | null }; url: string }) => {
        await sendVerificationEmail({ user, url, from: FROM })
      },
      sendResetPassword: async ({ user, url }: { user: { email: string; name?: string | null }; url: string }) => {
        await sendResetPasswordEmail({ user, url, from: FROM })
      },
    },
  })
}

export const auth = createAuth()
