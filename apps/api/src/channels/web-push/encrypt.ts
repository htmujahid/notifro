function b64urlToBytes(b64: string): Uint8Array {
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice(0, (4 - (b64.length % 4)) % 4)
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const a of arrays) {
    out.set(a, offset)
    offset += a.length
  }
  return out
}

async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, ikm))
}

async function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const blocks = Math.ceil(length / 32)
  let prev = new Uint8Array(0)
  const chunks: Uint8Array[] = []
  for (let i = 1; i <= blocks; i++) {
    const data = concat(prev, info, new Uint8Array([i]))
    prev = new Uint8Array(await crypto.subtle.sign('HMAC', key, data))
    chunks.push(prev)
  }
  return concat(...chunks).slice(0, length)
}

export async function encryptWebPushPayload(
  p256dhB64: string,
  authB64: string,
  plaintext: string,
): Promise<Uint8Array> {
  const subscriberPubBytes = b64urlToBytes(p256dhB64)
  const authSecret = b64urlToBytes(authB64)

  const subscriberKey = await crypto.subtle.importKey(
    'raw',
    subscriberPubBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    [],
  )

  const ephemeralPair = (await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  )) as CryptoKeyPair

  const ecdhParams = { name: 'ECDH', public: subscriberKey } as unknown as Parameters<SubtleCrypto['deriveBits']>[0]
  const sharedSecretBits = await crypto.subtle.deriveBits(ecdhParams, ephemeralPair.privateKey, 256)
  const sharedSecret = new Uint8Array(sharedSecretBits)

  const serverPubRaw = await crypto.subtle.exportKey('raw', ephemeralPair.publicKey)
  const serverPubBytes = new Uint8Array(serverPubRaw as ArrayBuffer)

  const info = concat(new TextEncoder().encode('WebPush: info\x00'), subscriberPubBytes, serverPubBytes)
  const prk = await hkdfExtract(authSecret, sharedSecret)
  const ikm = await hkdfExpand(prk, info, 32)

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const cekPrk = await hkdfExtract(salt, ikm)
  const cek = await hkdfExpand(cekPrk, new TextEncoder().encode('Content-Encoding: aes128gcm\x00'), 16)
  const nonce = await hkdfExpand(cekPrk, new TextEncoder().encode('Content-Encoding: nonce\x00'), 12)

  const cekKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt'])

  const data = new TextEncoder().encode(plaintext)
  const padded = new Uint8Array(data.length + 1)
  padded.set(data)
  padded[data.length] = 2

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, cekKey, padded),
  )

  const rs = 4096
  const header = new Uint8Array(16 + 4 + 1 + serverPubBytes.length)
  const view = new DataView(header.buffer)
  header.set(salt, 0)
  view.setUint32(16, rs, false)
  view.setUint8(20, serverPubBytes.length)
  header.set(serverPubBytes, 21)

  return concat(header, ciphertext)
}
