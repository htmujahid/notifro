export const APP_SCHEME = "notifro"

export const NATIVE_REDIRECT_URL = `${APP_SCHEME}://`

export function deepLinkToPath(url: string): string | null {
  const prefix = `${APP_SCHEME}://`
  if (!url.startsWith(prefix)) return null
  const rest = url.slice(prefix.length)
  if (!rest) return "/"
  return rest.startsWith("/") ? rest : `/${rest}`
}
