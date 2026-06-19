import { env } from 'cloudflare:workers'
import { betterAuth, generateId } from 'better-auth'
import { twoFactor, organization } from 'better-auth/plugins'
import { sendVerificationEmail, sendResetPasswordEmail, sendTwoFactorOTPEmail, sendInvitationEmail } from '@workspace/mailer'
import { mockD1 } from './mock-db'

const FROM = { email: 'noreply@renderical.com', name: 'Renderical' }

export function createAuth(db: D1Database = mockD1) {
  return betterAuth({
    appName: 'Renderical',
    database: db,
    trustedOrigins: [env.FRONTEND_URL],
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
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            const emailPrefix = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-')
            const slug = `${emailPrefix}-${user.id.slice(0, 6)}`
            const orgName = user.name || emailPrefix
            const orgId = generateId()
            const memberId = generateId()
            const now = new Date().toISOString()
            try {
              await db.prepare(
                'INSERT INTO organization (id, name, slug, createdAt) VALUES (?, ?, ?, ?)',
              ).bind(orgId, orgName, slug, now).run()
              await db.prepare(
                'INSERT INTO member (id, organizationId, userId, role, createdAt) VALUES (?, ?, ?, ?, ?)',
              ).bind(memberId, orgId, user.id, 'owner', now).run()
            } catch {
              // org creation is best-effort; don't block sign-up
            }
          },
        },
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
      organization({
        sendInvitationEmail: async ({ id, email, inviter, organization: org }) => {
          const url = `${env.FRONTEND_URL}/auth/accept-invitation/${id}`
          await sendInvitationEmail({
            email,
            inviterName: inviter.user.name || inviter.user.email,
            orgName: org.name,
            url,
            from: FROM,
          })
        },
      }),
    ],
  })
}

export const auth = createAuth()
