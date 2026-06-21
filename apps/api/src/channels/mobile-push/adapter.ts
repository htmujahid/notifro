import type { ChannelAdapter } from '../adapter'
import type { ComposePayload, Connection } from '../types'
import { registerAdapter } from '../registry'
import { registerTransform } from '../../compose/transform'
import { decrypt } from '../../lib/crypto'
import { sendApns, type ApnsCredentials } from './apns'
import { sendFcm, type FcmCredentials } from './fcm'

export interface MobilePushProvider {
  userId: string
  title: string
  body: string | null
}

interface MobilePushCredentials {
  apns?: ApnsCredentials
  fcm?: FcmCredentials
}

const TIMEOUT_MS = 10000

function stripMarkdown(input: string): string {
  return input
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`#>]/g, '')
    .trim()
}

function plainBody(payload: ComposePayload): string | null {
  const { body } = payload.content
  if (body.text) return body.text
  if (body.markdown) return stripMarkdown(body.markdown)
  return null
}

const mobilePushAdapter: ChannelAdapter<Record<string, never>, MobilePushProvider> = {
  type: 'mobile_push',

  validateConfig(_input) {
    return {}
  },

  transform(payload: ComposePayload, { connection }): MobilePushProvider {
    const recipient = payload.recipient as { type: string; userId?: string }
    const userId = recipient.type === 'user' && recipient.userId ? recipient.userId : connection.userId
    const title = payload.content.title ?? payload.content.subject ?? 'New notification'
    return { userId, title, body: plainBody(payload) }
  },

  async send(provider, conn, ctx) {
    const encKey = ctx.env?.CONNECTION_ENC_KEY
    if (!encKey) return { providerMessageId: null, ok: false, error: 'CONNECTION_ENC_KEY not configured' }
    if (!conn.credentials) {
      return { providerMessageId: null, ok: false, error: 'No mobile push credentials — add apns and/or fcm' }
    }

    let creds: MobilePushCredentials
    try {
      creds = JSON.parse(await decrypt(conn.credentials, encKey)) as MobilePushCredentials
    } catch {
      return { providerMessageId: null, ok: false, error: 'Failed to decrypt mobile push credentials' }
    }
    if (!creds.apns && !creds.fcm) {
      return { providerMessageId: null, ok: false, error: 'Mobile push credentials missing apns and fcm' }
    }

    const devices = await ctx.db
      .selectFrom('device_token')
      .where('userId', '=', provider.userId)
      .where('active', '=', 1)
      .selectAll()
      .execute()

    if (devices.length === 0) {
      return { providerMessageId: null, ok: false, error: 'No active device tokens for user' }
    }

    let anyOk = false
    let firstMessageId: string | null = null
    const errors: string[] = []

    for (const device of devices) {
      try {
        if (device.platform === 'ios') {
          if (!creds.apns) {
            errors.push(`${device.platform}: no APNs credentials`)
            continue
          }
          const result = await sendApns(creds.apns, device.token, provider, TIMEOUT_MS, ctx.env?.APNS_RELAY_URL)
          if (result.ok) {
            anyOk = true
            if (!firstMessageId) firstMessageId = result.apnsId
          } else {
            errors.push(`ios: ${result.reason}`)
            if (result.unregistered) {
              await ctx.db.updateTable('device_token').set({ active: 0, updatedAt: new Date().toISOString() }).where('id', '=', device.id).execute()
            }
          }
        } else if (device.platform === 'android') {
          if (!creds.fcm) {
            errors.push(`${device.platform}: no FCM credentials`)
            continue
          }
          const result = await sendFcm(creds.fcm, device.token, provider, TIMEOUT_MS)
          if (result.ok) {
            anyOk = true
            if (!firstMessageId) firstMessageId = result.messageId
          } else {
            errors.push(`android: ${result.reason}`)
            if (result.unregistered) {
              await ctx.db.updateTable('device_token').set({ active: 0, updatedAt: new Date().toISOString() }).where('id', '=', device.id).execute()
            }
          }
        } else {
          errors.push(`${device.platform}: unsupported platform`)
        }
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err))
      }
    }

    if (anyOk) return { providerMessageId: firstMessageId, ok: true }
    return { providerMessageId: null, ok: false, error: errors.join('; ') || 'All mobile push sends failed' }
  },

  async healthCheck(conn) {
    if (!conn.credentials) {
      return { ok: false, message: 'No credentials — add apns and/or fcm', checkedAt: new Date().toISOString() }
    }
    return { ok: true, message: 'Mobile push credentials present', checkedAt: new Date().toISOString() }
  },
}

registerAdapter(mobilePushAdapter)
registerTransform('mobile_push', (payload, ctx) =>
  mobilePushAdapter.transform(payload, ctx as { connection: Connection }),
)
