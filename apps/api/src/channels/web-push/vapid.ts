function b64urlToBytes(b64: string): Uint8Array {
  const padded =
    b64.replace(/-/g, "+").replace(/_/g, "/") +
    "===".slice(0, (4 - (b64.length % 4)) % 4)
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
}

function bytesToB64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
}

export async function buildVapidHeaders(
  endpoint: string,
  vapidPublicKeyB64: string,
  vapidPrivateKeyB64: string,
  subject: string
): Promise<{ Authorization: string }> {
  const pubBytes = b64urlToBytes(vapidPublicKeyB64)
  const privBytes = b64urlToBytes(vapidPrivateKeyB64)

  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    d: bytesToB64url(privBytes),
    x: bytesToB64url(pubBytes.slice(1, 33)),
    y: bytesToB64url(pubBytes.slice(33, 65)),
  }

  const signingKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  )

  const origin = new URL(endpoint).origin
  const now = Math.floor(Date.now() / 1000)

  const header = bytesToB64url(
    new TextEncoder().encode(JSON.stringify({ alg: "ES256", typ: "JWT" }))
  )
  const payload = bytesToB64url(
    new TextEncoder().encode(
      JSON.stringify({ aud: origin, exp: now + 43200, sub: subject })
    )
  )
  const toSign = `${header}.${payload}`

  const sigBuf = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    signingKey,
    new TextEncoder().encode(toSign)
  )
  const jwt = `${toSign}.${bytesToB64url(new Uint8Array(sigBuf))}`

  return { Authorization: `vapid t=${jwt},k=${vapidPublicKeyB64}` }
}
