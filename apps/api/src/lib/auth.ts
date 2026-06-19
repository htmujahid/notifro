import { env } from 'cloudflare:workers'
import { betterAuth } from 'better-auth'
import { twoFactor } from 'better-auth/plugins'
import { sendVerificationEmail, sendResetPasswordEmail, sendTwoFactorOTPEmail } from '@workspace/mailer'
import { mockD1 } from './mock-db'

const FROM = { email: 'noreply@renderical.com', name: 'Renderical' }

export function createAuth(db: D1Database = mockD1) {
  return betterAuth({
    appName: 'Renderical',
    database: db,
    trustedOrigins: [env.FRONTEND_URL],
    emailAndPassword: {
      enabled: true,
      sendVerificationEmail: async ({ user, url }: { user: { email: string; name?: string | null }; url: string }) => {
        await sendVerificationEmail({ user, url, from: FROM })
      },
      sendResetPassword: async ({ user, url }: { user: { email: string; name?: string | null }; url: string }) => {
        await sendResetPasswordEmail({ user, url, from: FROM })
      },
    },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    plugins: [
      twoFactor({
        otpOptions: {
          async sendOTP({ user, otp }: { user: { email: string; name?: string | null }; otp: string }) {
            await sendTwoFactorOTPEmail({ user, otp, from: FROM })
          },
        },
      }),
    ],
  })
}

export const auth = createAuth()
