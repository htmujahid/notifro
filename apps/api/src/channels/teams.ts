import type { ChannelAdapter } from './adapter'
import type { ComposePayload, Connection } from './types'
import type { ContentBlock } from '../compose/schema'
import { registerAdapter } from './registry'
import { registerTransform } from '../compose/transform'
import { decrypt } from '../lib/crypto'

export interface TeamsProvider {
  type: 'message'
  attachments: {
    contentType: 'application/vnd.microsoft.card.adaptive'
    content: Record<string, unknown>
  }[]
}

interface TeamsConfig {
  cardVersion?: string
}

interface TeamsCredentials {
  connectorUrl: string
}

const TIMEOUT_MS = 10000
const DEFAULT_VERSION = '1.5'

function textBlock(text: string, opts?: { bold?: boolean; large?: boolean }): Record<string, unknown> {
  const block: Record<string, unknown> = { type: 'TextBlock', text, wrap: true }
  if (opts?.bold) block.weight = 'Bolder'
  if (opts?.large) block.size = 'Large'
  return block
}

const teamsAdapter: ChannelAdapter<TeamsConfig, TeamsProvider> = {
  type: 'teams',

  validateConfig(input) {
    return (input ?? {}) as TeamsConfig
  },

  transform(payload, { connection }): TeamsProvider {
    const { content } = payload
    let cfg: TeamsConfig = {}
    try {
      cfg = JSON.parse(connection.config) as TeamsConfig
    } catch {}

    const body: Record<string, unknown>[] = []
    const actions: Record<string, unknown>[] = []

    const title = content.title ?? content.subject
    if (title) body.push(textBlock(title, { bold: true, large: true }))

    const main = content.body.markdown ?? content.body.text
    if (main) body.push(textBlock(main))

    for (const block of content.blocks ?? []) {
      addBlock(block, body, actions)
    }

    const card: Record<string, unknown> = {
      type: 'AdaptiveCard',
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: cfg.cardVersion ?? DEFAULT_VERSION,
      body,
    }
    if (actions.length > 0) card.actions = actions

    return {
      type: 'message',
      attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive', content: card }],
    }
  },

  async send(provider, conn, ctx) {
    const encKey = ctx.env?.CONNECTION_ENC_KEY
    if (!encKey) return { providerMessageId: null, ok: false, error: 'CONNECTION_ENC_KEY not configured' }
    if (!conn.credentials) {
      return { providerMessageId: null, ok: false, error: 'No Teams connector URL — add credentials.connectorUrl' }
    }

    let creds: TeamsCredentials
    try {
      creds = JSON.parse(await decrypt(conn.credentials, encKey)) as TeamsCredentials
    } catch {
      return { providerMessageId: null, ok: false, error: 'Failed to decrypt Teams credentials' }
    }
    if (!creds.connectorUrl) {
      return { providerMessageId: null, ok: false, error: 'Teams credentials missing connectorUrl' }
    }

    try {
      new URL(creds.connectorUrl)
    } catch {
      return { providerMessageId: null, ok: false, error: 'Teams connectorUrl is not a valid URL' }
    }

    try {
      const res = await fetch(creds.connectorUrl, {
        method: 'POST',
        redirect: 'manual',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(provider),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })

      if (res.status < 200 || res.status >= 300) {
        return { providerMessageId: null, ok: false, error: `HTTP ${res.status}` }
      }
      return { providerMessageId: null, ok: true }
    } catch (err) {
      return { providerMessageId: null, ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  },

  async healthCheck(conn) {
    if (!conn.credentials) {
      return { ok: false, message: 'No connector URL — add credentials.connectorUrl', checkedAt: new Date().toISOString() }
    }
    return { ok: true, message: 'Connector URL present', checkedAt: new Date().toISOString() }
  },
}

function addBlock(
  block: ContentBlock,
  body: Record<string, unknown>[],
  actions: Record<string, unknown>[],
): void {
  switch (block.type) {
    case 'heading':
      body.push(textBlock(block.text, { bold: true }))
      return
    case 'text':
      body.push(textBlock(block.markdown ?? block.text))
      return
    case 'image':
      body.push({ type: 'Image', url: block.url, altText: block.alt ?? block.title ?? 'image' })
      return
    case 'fields':
      body.push({
        type: 'FactSet',
        facts: block.fields.map((f) => ({ title: f.key, value: f.value })),
      })
      return
    case 'button':
      if (block.url) actions.push({ type: 'Action.OpenUrl', title: block.label, url: block.url })
      return
    case 'button_group':
      for (const b of block.buttons) {
        if (b.url) actions.push({ type: 'Action.OpenUrl', title: b.label, url: b.url })
      }
      return
    default:
      return
  }
}

registerAdapter(teamsAdapter)
registerTransform('teams', (payload, ctx) =>
  teamsAdapter.transform(payload, ctx as { connection: Connection }),
)
