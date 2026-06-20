const IV_LENGTH = 12

function b64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

function bytesToB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

async function importKey(rawKey: string): Promise<CryptoKey> {
  const keyBytes = b64ToBytes(rawKey)
  return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

export async function encrypt(plaintext: string, rawKey: string): Promise<string> {
  const key = await importKey(rawKey)
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), IV_LENGTH)
  return bytesToB64(combined.buffer)
}

export async function decrypt(ciphertext: string, rawKey: string): Promise<string> {
  const key = await importKey(rawKey)
  const combined = b64ToBytes(ciphertext)
  const iv = combined.slice(0, IV_LENGTH)
  const data = combined.slice(IV_LENGTH)
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
  return new TextDecoder().decode(plaintext)
}
