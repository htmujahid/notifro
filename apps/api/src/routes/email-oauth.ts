import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { requireOrg } from '../middleware/auth'
import { encrypt } from '../lib/crypto'
import {
  buildGmailAuthUrl,
  exchangeGmailCode,
  fetchGmailUserInfo,
  GMAIL_SCOPE,
} from '../channels/email-oauth'
import type { AppEnv } from '../lib/types'
import { validationHook } from '../lib/errors'

const router = new OpenAPIHono<AppEnv>({ defaultHook: validationHook })

function now(): string {
  return new Date().toISOString()
}

function newId(): string {
  return crypto.randomUUID()
}

function redirectUri(env: CloudflareBindings): string {
  return `${env.BETTER_AUTH_URL}/api/connections/email/oauth/callback`
}

const startRoute = createRoute({
  method: 'get',
  path: '/connections/email/oauth/start',
  responses: {
    302: { description: 'Redirect to Google OAuth' },
  },
})

router.use('/connections/email/oauth/start', requireOrg)

router.openapi(startRoute, (c) => {
  const state = btoa(JSON.stringify({ orgId: c.var.org.id, nonce: crypto.randomUUID() }))
  const url = buildGmailAuthUrl(c.env.GOOGLE_CLIENT_ID, redirectUri(c.env), state)
  return c.redirect(url, 302)
})

const callbackQuerySchema = z.object({
  code: z.string(),
  state: z.string(),
  error: z.string().optional(),
})

const callbackRoute = createRoute({
  method: 'get',
  path: '/connections/email/oauth/callback',
  request: { query: callbackQuerySchema },
  responses: {
    302: { description: 'Redirect to channels page after OAuth' },
  },
})

router.openapi(callbackRoute, async (c) => {
  const { code, state, error } = c.req.valid('query')

  if (error) {
    return c.redirect(`${c.env.FRONTEND_URL}/channels?error=${encodeURIComponent(error)}`, 302)
  }

  let orgId: string
  try {
    const decoded = JSON.parse(atob(state)) as { orgId?: string }
    if (!decoded.orgId) throw new Error('missing orgId')
    orgId = decoded.orgId
  } catch {
    return c.redirect(`${c.env.FRONTEND_URL}/channels?error=invalid_state`, 302)
  }

  try {
    const redir = redirectUri(c.env)
    const tokens = await exchangeGmailCode(code, c.env.GOOGLE_CLIENT_ID, c.env.GOOGLE_CLIENT_SECRET, redir)
    const userInfo = await fetchGmailUserInfo(tokens.access_token)

    const credentials = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: tokens.token_type,
      expiry_ms: tokens.expiry_ms,
      email: userInfo.email,
      displayName: userInfo.name,
    }
    const encryptedCredentials = await encrypt(JSON.stringify(credentials), c.env.CONNECTION_ENC_KEY)

    const existing = await c.var.db
      .selectFrom('connection')
      .where('organizationId', '=', orgId)
      .where('type', '=', 'email')
      .select('id')
      .executeTakeFirst()

    const ts = now()

    if (existing) {
      await c.var.db
        .updateTable('connection')
        .set({
          name: userInfo.email,
          status: 'active',
          credentials: encryptedCredentials,
          scopes: JSON.stringify([GMAIL_SCOPE]),
          updatedAt: ts,
        })
        .where('id', '=', existing.id)
        .execute()
    } else {
      await c.var.db
        .insertInto('connection')
        .values({
          id: newId(),
          organizationId: orgId,
          type: 'email',
          name: userInfo.email,
          status: 'active',
          config: '{}',
          credentials: encryptedCredentials,
          scopes: JSON.stringify([GMAIL_SCOPE]),
          health: null,
          createdAt: ts,
          updatedAt: ts,
        })
        .execute()
    }

    return c.redirect(`${c.env.FRONTEND_URL}/channels?connected=email`, 302)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'oauth_error'
    return c.redirect(`${c.env.FRONTEND_URL}/channels?error=${encodeURIComponent(msg)}`, 302)
  }
})

export default router
