export interface FcmCredentials {
  projectId: string
  serviceAccountJson: string
}

export interface FcmPayload {
  title: string
  body: string | null
}

export interface FcmSendResult {
  ok: boolean
  status: number
  messageId: string | null
  reason: string | null
  unregistered: boolean
}

interface ServiceAccount {
  client_email: string
  private_key: string
  token_uri?: string
  project_id?: string
}

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging'
const DEFAULT_TOKEN_URI = 'https://oauth2.googleapis.com/token'
const TOKEN_TTL_MS = 50 * 60 * 1000

const accessTokenCache = new Map<string, { token: string; exp: number }>()

function bytesToB64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function pemToDer(pem: string): Uint8Array {
  const base64 = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '')
  return Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0))
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const cached = accessTokenCache.get(sa.client_email)
  const nowMs = Date.now()
  if (cached && cached.exp > nowMs) return cached.token

  const der = pemToDer(sa.private_key)
  const key = await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const tokenUri = sa.token_uri ?? DEFAULT_TOKEN_URI
  const iat = Math.floor(nowMs / 1000)
  const header = bytesToB64url(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })))
  const claims = bytesToB64url(
    new TextEncoder().encode(
      JSON.stringify({ iss: sa.client_email, scope: FCM_SCOPE, aud: tokenUri, iat, exp: iat + 3600 }),
    ),
  )
  const toSign = `${header}.${claims}`
  const sig = await crypto.subtle.sign({ name: 'RSASSA-PKCS1-v1_5' }, key, new TextEncoder().encode(toSign))
  const assertion = `${toSign}.${bytesToB64url(new Uint8Array(sig))}`

  const res = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })

  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const err = (await res.json()) as { error_description?: string; error?: string }
      detail = err.error_description ?? err.error ?? detail
    } catch {}
    throw new Error(`FCM OAuth failed: ${detail}`)
  }

  const data = (await res.json()) as { access_token: string }
  accessTokenCache.set(sa.client_email, { token: data.access_token, exp: nowMs + TOKEN_TTL_MS })
  return data.access_token
}

export async function sendFcm(
  creds: FcmCredentials,
  deviceToken: string,
  payload: FcmPayload,
  timeoutMs: number,
): Promise<FcmSendResult> {
  const sa = JSON.parse(creds.serviceAccountJson) as ServiceAccount
  const projectId = creds.projectId || sa.project_id || ''
  if (!projectId) {
    return { ok: false, status: 0, messageId: null, reason: 'Missing FCM projectId', unregistered: false }
  }

  const accessToken = await getAccessToken(sa)
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        token: deviceToken,
        notification: { title: payload.title, body: payload.body ?? undefined },
      },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  })

  if (res.ok) {
    const data = (await res.json()) as { name?: string }
    return { ok: true, status: res.status, messageId: data.name ?? null, reason: null, unregistered: false }
  }

  let reason: string | null = null
  try {
    const err = (await res.json()) as { error?: { status?: string; message?: string } }
    reason = err.error?.status ?? err.error?.message ?? null
  } catch {}

  const unregistered = res.status === 404 || reason === 'NOT_FOUND' || reason === 'UNREGISTERED'
  return { ok: false, status: res.status, messageId: null, reason: reason ?? `HTTP ${res.status}`, unregistered }
}
