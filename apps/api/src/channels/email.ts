import type { ChannelAdapter } from './adapter'
import type { ComposePayload, Connection } from './types'
import { registerAdapter } from './registry'
import { registerTransform } from '../compose/transform'
import { buildRfc2822Email, sendGmailMessage } from './email-oauth'

export interface EmailProvider {
  to: string
  subject: string
  html: string
  text: string
  accessToken: string
  fromEmail: string
}

interface EmailConfig {}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function renderHtml(payload: ComposePayload): string {
  const { content } = payload
  const parts: string[] = []
  const heading = content.subject ?? content.title
  if (heading) {
    parts.push(`<h1 style="font-size:20px;margin:0 0 16px">${esc(heading)}</h1>`)
  }
  if (content.body.text) {
    for (const p of content.body.text.split('\n\n')) {
      parts.push(`<p style="margin:0 0 12px">${esc(p).replace(/\n/g, '<br>')}</p>`)
    }
  }
  for (const block of content.blocks ?? []) {
    if (block.type === 'text') {
      parts.push(`<p style="margin:0 0 12px">${esc(block.text)}</p>`)
    } else if (block.type === 'heading') {
      const l = block.level ?? 2
      parts.push(`<h${l} style="margin:0 0 12px">${esc(block.text)}</h${l}>`)
    } else if (block.type === 'divider') {
      parts.push('<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">')
    } else if (block.type === 'button') {
      parts.push(
        `<a href="${esc(block.url ?? '#')}" style="display:inline-block;background:#111;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none">${esc(block.label)}</a>`,
      )
    } else if (block.type === 'image') {
      parts.push(`<img src="${esc(block.url)}" alt="${esc(block.alt ?? '')}" style="max-width:100%;height:auto">`)
    } else if (block.type === 'fields') {
      const rows = block.fields
        .map((f) => `<tr><td style="padding:4px 8px 4px 0;color:#6b7280">${esc(f.key)}</td><td style="padding:4px 0">${esc(f.value)}</td></tr>`)
        .join('')
      parts.push(`<table style="border-collapse:collapse">${rows}</table>`)
    }
  }
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px 16px;color:#111">${parts.join('')}</body></html>`
}

function renderText(payload: ComposePayload): string {
  const { content } = payload
  const parts: string[] = []
  const heading = content.subject ?? content.title
  if (heading) parts.push(heading)
  if (content.body.text) parts.push(content.body.text)
  for (const block of content.blocks ?? []) {
    if (block.type === 'text' || block.type === 'heading') parts.push(block.text)
    else if (block.type === 'button') parts.push(`${block.label}${block.url ? ': ' + block.url : ''}`)
    else if (block.type === 'divider') parts.push('---')
    else if (block.type === 'fields') parts.push(block.fields.map((f) => `${f.key}: ${f.value}`).join('\n'))
  }
  return parts.join('\n\n')
}

function buildProvider(payload: ComposePayload): Omit<EmailProvider, 'accessToken' | 'fromEmail'> {
  const { recipient } = payload
  let to = ''
  if (recipient.type === 'contact' && recipient.email) to = recipient.email
  if (!to) throw new Error('Email recipient requires contact.email')
  return {
    to,
    subject: payload.content.subject ?? payload.content.title ?? '(no subject)',
    html: renderHtml(payload),
    text: renderText(payload),
  }
}

const emailAdapter: ChannelAdapter<EmailConfig, EmailProvider> = {
  type: 'email',

  validateConfig(input) {
    return (input ?? {}) as EmailConfig
  },

  transform(payload, _ctx): EmailProvider {
    return { ...buildProvider(payload), accessToken: '', fromEmail: '' }
  },

  async send(provider, _conn) {
    if (!provider.accessToken) {
      return { providerMessageId: null, ok: false, error: 'No Gmail access token — connect Gmail first' }
    }
    try {
      const raw = buildRfc2822Email({
        from: provider.fromEmail,
        to: provider.to,
        subject: provider.subject,
        html: provider.html,
        text: provider.text,
      })
      const { id } = await sendGmailMessage(provider.accessToken, raw)
      return { providerMessageId: id, ok: true }
    } catch (err) {
      return { providerMessageId: null, ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  },

  async healthCheck(_conn) {
    return {
      ok: true,
      message: 'Connection record exists — live token check requires the encryption key (M15)',
      checkedAt: new Date().toISOString(),
    }
  },
}

registerAdapter(emailAdapter)
registerTransform('email', (payload, ctx) => emailAdapter.transform(payload, ctx as { connection: Connection }))
