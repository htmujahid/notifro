/**
 * Deep-link helpers shared across platforms.
 *
 * Auth emails (verify email, reset password) and OAuth flows are opened in the
 * system browser, which hits the API server and then 302-redirects to a
 * `callbackURL`/`redirectTo`. For that redirect to return control to the app it
 * must point at an OS-routable target:
 *   - web      → the frontend origin (https URL)
 *   - native   → the custom scheme `renderical://`, which the OS routes back
 *                to the installed Electron / Capacitor app.
 *
 * The native scheme must also be registered in the API server's
 * `trustedOrigins`, otherwise better-auth rejects the callback as untrusted.
 */

export const APP_SCHEME = "renderical"

/** Per-platform redirect base for native apps (Electron + Capacitor). */
export const NATIVE_REDIRECT_URL = `${APP_SCHEME}://`

/**
 * Build an absolute auth callback URL from a per-platform base and an in-app
 * path. Works for both http(s) origins and the custom `renderical://` scheme.
 *
 *   buildAuthURL("https://app.renderical.com", "/")            → "https://app.renderical.com/"
 *   buildAuthURL("renderical://", "/auth/reset-password")      → "renderical://auth/reset-password"
 */
export function buildAuthURL(base: string, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  // Scheme-only bases ("renderical://") have no host — append the path
  // directly so the first segment doesn't get swallowed as the authority.
  if (base.endsWith("//")) {
    return `${base}${normalizedPath.replace(/^\//, "")}`
  }
  return `${base.replace(/\/$/, "")}${normalizedPath}`
}

/**
 * Convert an incoming deep link into an in-app router path. Returns null when
 * the URL doesn't belong to this app's scheme.
 *
 *   deepLinkToPath("renderical://auth/reset-password?token=x") → "/auth/reset-password?token=x"
 *   deepLinkToPath("renderical://")                            → "/"
 *   deepLinkToPath("https://example.com")                      → null
 */
export function deepLinkToPath(url: string): string | null {
  const prefix = `${APP_SCHEME}://`
  if (!url.startsWith(prefix)) return null
  const rest = url.slice(prefix.length)
  if (!rest) return "/"
  return rest.startsWith("/") ? rest : `/${rest}`
}
