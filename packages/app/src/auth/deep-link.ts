export const APP_SCHEME = "renderical"

export const NATIVE_REDIRECT_URL = `${APP_SCHEME}://`

export function buildAuthURL(base: string, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  if (base.endsWith("//")) {
    return `${base}${normalizedPath.replace(/^\//, "")}`
  }
  return `${base.replace(/\/$/, "")}${normalizedPath}`
}

export function deepLinkToPath(url: string): string | null {
  const prefix = `${APP_SCHEME}://`
  if (!url.startsWith(prefix)) return null
  const rest = url.slice(prefix.length)
  if (!rest) return "/"
  return rest.startsWith("/") ? rest : `/${rest}`
}
