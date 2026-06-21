export interface ApnsCredentials {
  keyId: string
  teamId: string
  bundleId: string
  p8: string
}

export interface ApnsPayload {
  title: string
  body: string | null
}

export interface ApnsSendResult {
  ok: boolean
  status: number
  apnsId: string | null
  reason: string | null
  unregistered: boolean
}

const APNS_HOST = "https://api.push.apple.com"
const TOKEN_TTL_MS = 50 * 60 * 1000

const jwtCache = new Map<string, { jwt: string; exp: number }>()

function bytesToB64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
}

function pemToDer(pem: string): Uint8Array {
  const base64 = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "")
  return Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0))
}

async function buildJwt(creds: ApnsCredentials): Promise<string> {
  const cacheKey = `${creds.teamId}:${creds.keyId}`
  const cached = jwtCache.get(cacheKey)
  const nowMs = Date.now()
  if (cached && cached.exp > nowMs) return cached.jwt

  const der = pemToDer(creds.p8)
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  )

  const iat = Math.floor(nowMs / 1000)
  const header = bytesToB64url(
    new TextEncoder().encode(JSON.stringify({ alg: "ES256", kid: creds.keyId }))
  )
  const payload = bytesToB64url(
    new TextEncoder().encode(JSON.stringify({ iss: creds.teamId, iat }))
  )
  const toSign = `${header}.${payload}`

  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(toSign)
  )
  const jwt = `${toSign}.${bytesToB64url(new Uint8Array(sig))}`

  jwtCache.set(cacheKey, { jwt, exp: nowMs + TOKEN_TTL_MS })
  return jwt
}

export async function sendApns(
  creds: ApnsCredentials,
  deviceToken: string,
  payload: ApnsPayload,
  timeoutMs: number,
  relayUrl?: string
): Promise<ApnsSendResult> {
  const jwt = await buildJwt(creds)
  const body = JSON.stringify({
    aps: {
      alert: { title: payload.title, body: payload.body ?? undefined },
      sound: "default",
    },
  })

  const host = relayUrl ?? APNS_HOST
  const res = await fetch(`${host}/3/device/${deviceToken}`, {
    method: "POST",
    headers: {
      authorization: `bearer ${jwt}`,
      "apns-topic": creds.bundleId,
      "apns-push-type": "alert",
      "content-type": "application/json",
    },
    body,
    signal: AbortSignal.timeout(timeoutMs),
  })

  const apnsId = res.headers.get("apns-id")
  if (res.status === 200) {
    return { ok: true, status: 200, apnsId, reason: null, unregistered: false }
  }

  let reason: string | null = null
  try {
    const data = (await res.json()) as { reason?: string }
    if (data.reason) reason = data.reason
  } catch {}

  const unregistered =
    res.status === 410 ||
    reason === "BadDeviceToken" ||
    reason === "Unregistered"
  return {
    ok: false,
    status: res.status,
    apnsId,
    reason: reason ?? `HTTP ${res.status}`,
    unregistered,
  }
}
