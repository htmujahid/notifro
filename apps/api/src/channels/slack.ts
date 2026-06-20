import type { ChannelAdapter } from './adapter'
import type { ComposePayload, Connection } from './types'
import type { ContentBlock } from '../compose/schema'
import { registerAdapter } from './registry'
import { registerTransform } from '../compose/transform'
import { decrypt } from '../lib/crypto'

export interface SlackProvider {
  channelId: string
  text: string
  blocks: unknown[]
}

interface SlackConfig {
  channelId?: string
}

interface SlackCredentials {
  botToken: string
}

const TIMEOUT_MS = 15000
const MAX_BLOCKS = 50

function escapeMrkdwn(input: string): string {
  return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function toMrkdwn(input: string): string {
  let s = escapeMrkdwn(input)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, url) => `<${url}|${label}>`)
  s = s.replace(/\*\*([^*]+)\*\*/g, '*$1*')
  return s
}

function section(text: string) {
  return { type: 'section', text: { type: 'mrkdwn', text } }
}

function buttonElement(btn: { label: string; url?: string; action?: string; style?: string }) {
  const element: Record<string, unknown> = {
    type: 'button',
    text: { type: 'plain_text', text: btn.label, emoji: true },
  }
  if (btn.url) element.url = btn.url
  if (btn.action) element.action_id = btn.action
  if (btn.style === 'primary' || btn.style === 'danger') element.style = btn.style
  return element
}

function blockFor(block: ContentBlock): unknown[] {
  switch (block.type) {
    case 'heading':
      return [section(`*${toMrkdwn(block.text)}*`)]
    case 'text':
      return [section(toMrkdwn(block.markdown ?? block.text))]
    case 'image':
      return [
        {
          type: 'image',
          image_url: block.url,
          alt_text: block.alt ?? block.title ?? 'image',
        },
      ]
    case 'divider':
      return [{ type: 'divider' }]
    case 'button':
      return [{ type: 'actions', elements: [buttonElement(block)] }]
    case 'button_group':
      return [{ type: 'actions', elements: block.buttons.map(buttonElement) }]
    case 'fields':
      return [
        {
          type: 'section',
          fields: block.fields.map((f) => ({
            type: 'mrkdwn',
            text: `*${toMrkdwn(f.key)}*\n${toMrkdwn(f.value)}`,
          })),
        },
      ]
    default:
      return []
  }
}

function buildText(payload: ComposePayload): string {
  const { content } = payload
  const title = content.title ?? content.subject ?? ''
  const body = content.body.text ?? content.body.markdown ?? ''
  return [title, body].filter(Boolean).join('\n\n').slice(0, 3000)
}

function buildBlocks(payload: ComposePayload): unknown[] {
  const { content } = payload
  const blocks: unknown[] = []

  const title = content.title ?? content.subject
  if (title) {
    blocks.push({
      type: 'header',
      text: { type: 'plain_text', text: title.slice(0, 150), emoji: true },
    })
  }

  const body = content.body.markdown ?? content.body.text
  if (body) blocks.push(section(toMrkdwn(body)))

  for (const block of content.blocks ?? []) {
    blocks.push(...blockFor(block))
  }

  if (blocks.length > MAX_BLOCKS) {
    const truncated = blocks.slice(0, MAX_BLOCKS - 1)
    truncated.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: '_message truncated_' }],
    })
    return truncated
  }

  return blocks
}

const slackAdapter: ChannelAdapter<SlackConfig, SlackProvider> = {
  type: 'slack',

  validateConfig(input) {
    return (input ?? {}) as SlackConfig
  },

  transform(payload, { connection }): SlackProvider {
    let channelId = ''
    try {
      const cfg = JSON.parse(connection.config) as SlackConfig
      if (cfg.channelId) channelId = cfg.channelId
    } catch {}
    if (!channelId) throw new Error('Slack connection requires config.channelId')

    return { channelId, text: buildText(payload), blocks: buildBlocks(payload) }
  },

  async send(provider, conn, ctx) {
    const encKey = ctx.env?.CONNECTION_ENC_KEY
    if (!encKey) return { providerMessageId: null, ok: false, error: 'CONNECTION_ENC_KEY not configured' }
    if (!conn.credentials) {
      return { providerMessageId: null, ok: false, error: 'No Slack bot token — add credentials.botToken' }
    }

    let creds: SlackCredentials
    try {
      creds = JSON.parse(await decrypt(conn.credentials, encKey)) as SlackCredentials
    } catch {
      return { providerMessageId: null, ok: false, error: 'Failed to decrypt Slack credentials' }
    }
    if (!creds.botToken) {
      return { providerMessageId: null, ok: false, error: 'Slack credentials missing botToken' }
    }

    try {
      const res = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Bearer ${creds.botToken}`,
        },
        body: JSON.stringify({
          channel: provider.channelId,
          text: provider.text,
          blocks: provider.blocks,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })

      if (!res.ok) {
        return { providerMessageId: null, ok: false, error: `Slack error ${res.status}` }
      }

      const data = (await res.json()) as { ok?: boolean; ts?: string; error?: string }
      if (!data.ok) {
        return { providerMessageId: null, ok: false, error: data.error ?? 'unknown_slack_error' }
      }

      return { providerMessageId: data.ts ?? null, ok: true }
    } catch (err) {
      return { providerMessageId: null, ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  },

  async healthCheck(conn) {
    if (!conn.credentials) {
      return { ok: false, message: 'No bot token — add credentials.botToken', checkedAt: new Date().toISOString() }
    }
    return { ok: true, message: 'Bot token present', checkedAt: new Date().toISOString() }
  },
}

registerAdapter(slackAdapter)
registerTransform('slack', (payload, ctx) =>
  slackAdapter.transform(payload, ctx as { connection: Connection }),
)
