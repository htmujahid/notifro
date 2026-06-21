export function resolveLocale(
  requested: string | undefined,
  available: string[],
  defaultLocale: string,
): string {
  if (!requested) return defaultLocale
  if (available.includes(requested)) return requested
  const base = requested.split('-')[0]
  if (base && available.includes(base)) return base
  return defaultLocale
}

export function getLocaleStrings(
  localeStrings: Record<string, Record<string, string>>,
  locale: string,
  defaultLocale: string,
): Record<string, string> {
  return localeStrings[locale] ?? localeStrings[defaultLocale] ?? {}
}
