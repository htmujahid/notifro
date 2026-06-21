import { env } from 'cloudflare:workers'
import { betterAuth } from 'better-auth'
import { twoFactor, phoneNumber } from 'better-auth/plugins'
import { apiKey } from '@better-auth/api-key'
import { sendVerificationEmail, sendResetPasswordEmail, sendTwoFactorOTPEmail } from '@workspace/mailer'
import { mockD1 } from './mock-db'
import { kvSecondaryStorage } from './kv-storage'

const FROM = { email: 'noreply@renderical.com', name: 'Renderical' }

export function createAuth(db: D1Database = mockD1) {
  return betterAuth({
    appName: 'Renderical',
    database: db,
    secondaryStorage: kvSecondaryStorage(env.KV),
    rateLimit: {
      enabled: true,
      storage: 'secondary-storage',
      window: 60,
      max: 100,
    },
    trustedOrigins: [env.FRONTEND_URL, 'renderical://', 'renderical://**'],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendVerificationEmail: async ({ user, url }: { user: { email: string; name?: string | null }; url: string }) => {
        await sendVerificationEmail({ user, url, from: FROM })
      },
      sendResetPassword: async ({ user, url }: { user: { email: string; name?: string | null }; url: string }) => {
        await sendResetPasswordEmail({ user, url, from: FROM })
      },
    },
    emailVerification: {
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }: { user: { email: string; name?: string | null }; url: string }) => {
        await sendVerificationEmail({ user, url, from: FROM })
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
      phoneNumber({
        sendOTP: async ({ phoneNumber: to, code }) => {
          const sid = env.TWILIO_ACCOUNT_SID
          const token = env.TWILIO_AUTH_TOKEN
          const from = env.TWILIO_FROM_NUMBER
          if (!sid || !token || !from) return
          await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
            method: 'POST',
            headers: {
              Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ To: to, From: from, Body: `Your Renderical verification code: ${code}` }),
          })
        },
        otpLength: 6,
        expiresIn: 300,
      }),
      apiKey({
        defaultPrefix: 'rk_',
        enableMetadata: true,
        rateLimit: { enabled: false },
      }),
    ],
  })
}

export const auth = createAuth()
export const authInstance = createAuth(env.DB)
