export type TrackingClaims = {
  d: string
  t: "open" | "click"
  u?: string
}

function b64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
}

function b64urlDecode(str: string): Uint8Array {
  const pad = (4 - (str.length % 4)) % 4
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad)
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  const keyBytes = b64urlDecode(secret)
  return crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  )
}

export async function signTrackingToken(
  claims: TrackingClaims,
  secret: string
): Promise<string> {
  const payload = b64urlEncode(new TextEncoder().encode(JSON.stringify(claims)))
  const key = await getHmacKey(secret)
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  )
  return `${payload}.${b64urlEncode(sig)}`
}

export async function verifyTrackingToken(
  token: string,
  secret: string
): Promise<TrackingClaims | null> {
  const dot = token.lastIndexOf(".")
  if (dot === -1) return null
  const payload = token.slice(0, dot)
  const sigStr = token.slice(dot + 1)
  try {
    const key = await getHmacKey(secret)
    const sigBytes = b64urlDecode(sigStr)
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      new TextEncoder().encode(payload)
    )
    if (!ok) return null
    return JSON.parse(
      new TextDecoder().decode(b64urlDecode(payload))
    ) as TrackingClaims
  } catch {
    return null
  }
}
