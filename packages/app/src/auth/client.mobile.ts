import { createBaseAuthClient } from "./client"

export interface CapacitorPreferences {
  get(options: { key: string }): Promise<{ value: string | null }>
  set(options: { key: string; value: string }): Promise<void>
  remove(options: { key: string }): Promise<void>
}

const COOKIE_STORAGE_KEY = "better-auth.cookies"

export function createMobileAuthClient(
  baseURL: string,
  Preferences: CapacitorPreferences
) {
  return createBaseAuthClient(baseURL, {
    fetchOptions: {
      credentials: "omit",
      onRequest: async (context) => {
        const { value } = await Preferences.get({ key: COOKIE_STORAGE_KEY })
        if (value) {
          context.headers.set("cookie", value)
        }
      },
      onResponse: async (context) => {
        const setCookie = context.response.headers.get("set-cookie")
        if (!setCookie) return

        const { value: existing } = await Preferences.get({
          key: COOKIE_STORAGE_KEY,
        })
        const merged = mergeCookies(existing ?? "", setCookie)
        await Preferences.set({ key: COOKIE_STORAGE_KEY, value: merged })
      },
    },
  })
}

function mergeCookies(existing: string, setCookieHeader: string): string {
  const current: Record<string, string> = {}

  for (const pair of existing
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)) {
    const [k, v] = pair.split("=")
    if (k) current[k.trim()] = v?.trim() ?? ""
  }

  for (const directive of setCookieHeader.split(",")) {
    const nameValue = directive.split(";")[0]?.trim()
    if (!nameValue) continue
    const eqIdx = nameValue.indexOf("=")
    if (eqIdx === -1) continue
    const k = nameValue.slice(0, eqIdx).trim()
    const v = nameValue.slice(eqIdx + 1).trim()
    if (k) current[k] = v
  }

  return Object.entries(current)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ")
}
