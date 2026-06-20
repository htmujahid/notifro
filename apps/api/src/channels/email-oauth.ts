import { encrypt, decrypt } from '../lib/crypto'
import type { Connection } from './types'
import type { AppDB } from '../db/client'

export interface GmailCredentials {
  access_token: string
  refresh_token: string
  token_type: string
  expiry_ms: number
  email: string
  displayName?: string
}

const GMAIL_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GMAIL_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GMAIL_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'
const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'
const GMAIL_PROFILE_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/profile'
export const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.send'

export function buildGmailAuthUrl(clientId: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GMAIL_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `${GMAIL_AUTH_URL}?${params.toString()}`
}

export async function exchangeGmailCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<{ access_token: string; refresh_token: string; token_type: string; expiry_ms: number }> {
  const res = await fetch(GMAIL_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token exchange failed: ${text}`)
  }
  const data = (await res.json()) as {
    access_token: string
    refresh_token: string
    token_type: string
    expires_in: number
  }
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_type: data.token_type,
    expiry_ms: Date.now() + data.expires_in * 1000,
  }
}

export async function fetchGmailUserInfo(accessToken: string): Promise<{ email: string; name?: string }> {
  const res = await fetch(GMAIL_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Failed to fetch Gmail user info')
  return res.json() as Promise<{ email: string; name?: string }>
}

export async function refreshGmailToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<{ access_token: string; expiry_ms: number }> {
  const res = await fetch(GMAIL_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token refresh failed: ${text}`)
  }
  const data = (await res.json()) as { access_token: string; expires_in: number }
  return {
    access_token: data.access_token,
    expiry_ms: Date.now() + data.expires_in * 1000,
  }
}

export async function maybeRefreshGmailCredentials(
  db: AppDB,
  env: { CONNECTION_ENC_KEY: string; GOOGLE_CLIENT_ID: string; GOOGLE_CLIENT_SECRET: string },
  conn: Connection,
): Promise<Connection> {
  if (!conn.credentials) return conn
  const creds = JSON.parse(await decrypt(conn.credentials, env.CONNECTION_ENC_KEY)) as GmailCredentials
  if (Date.now() < creds.expiry_ms - 60_000) return conn

  const refreshed = await refreshGmailToken(creds.refresh_token, env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET)
  const updated: GmailCredentials = { ...creds, ...refreshed }
  const encryptedCredentials = await encrypt(JSON.stringify(updated), env.CONNECTION_ENC_KEY)

  await db
    .updateTable('connection')
    .set({ credentials: encryptedCredentials, updatedAt: new Date().toISOString() })
    .where('id', '=', conn.id)
    .execute()

  return { ...conn, credentials: encryptedCredentials }
}

export async function decryptGmailCredentials(conn: Connection, encKey: string): Promise<GmailCredentials> {
  if (!conn.credentials) throw new Error('No credentials on email connection')
  return JSON.parse(await decrypt(conn.credentials, encKey)) as GmailCredentials
}

function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}

export function buildRfc2822Email(opts: {
  from: string
  to: string
  subject: string
  html: string
  text: string
}): string {
  const boundary = `=_Part_${crypto.randomUUID().replace(/-/g, '')}`
  const parts = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    toBase64(opts.text),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    toBase64(opts.html),
    '',
    `--${boundary}--`,
  ]
  const raw = parts.join('\r\n')
  return toBase64(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function sendGmailMessage(accessToken: string, rawBase64url: string): Promise<{ id: string }> {
  const res = await fetch(GMAIL_SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: rawBase64url }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Gmail send failed (${res.status}): ${body}`)
  }
  return res.json() as Promise<{ id: string }>
}

export async function checkGmailProfile(accessToken: string): Promise<{ emailAddress: string }> {
  const res = await fetch(GMAIL_PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Gmail profile check failed')
  return res.json() as Promise<{ emailAddress: string }>
}
