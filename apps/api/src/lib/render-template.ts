import { getLocaleStrings, resolveLocale } from "@notifro/i18n"
import { renderValue } from "@notifro/templating"

import type { AppDB } from "../db/client"
import { Errors } from "./errors"

interface VariableDef {
  key: string
  type: string
  required?: boolean
}

function resolveNestedPath(
  data: Record<string, unknown>,
  path: string
): unknown {
  return path.split(".").reduce((obj: unknown, key) => {
    if (obj == null || typeof obj !== "object") return undefined
    return (obj as Record<string, unknown>)[key]
  }, data as unknown)
}

export async function resolveTemplate(
  db: AppDB,
  userId: string,
  ref: { templateId?: string; templateSlug?: string }
) {
  if (ref.templateId) {
    const row = await db
      .selectFrom("template")
      .where("id", "=", ref.templateId)
      .where("userId", "=", userId)
      .selectAll()
      .executeTakeFirst()
    if (!row) throw Errors.notFound("Template")
    return row
  }
  if (ref.templateSlug) {
    const row = await db
      .selectFrom("template")
      .where("slug", "=", ref.templateSlug)
      .where("userId", "=", userId)
      .selectAll()
      .executeTakeFirst()
    if (!row) throw Errors.notFound("Template")
    return row
  }
  throw Errors.badRequest("templateId or templateSlug is required")
}

export function renderTemplate(
  template: {
    content: string
    variables: string | null
    localeStrings: string | null
    defaultLocale: string
  },
  data: Record<string, unknown>,
  locale?: string
): Record<string, unknown> {
  const variables: VariableDef[] = template.variables
    ? JSON.parse(template.variables)
    : []
  const missing = variables.filter(
    (v) => v.required && resolveNestedPath(data, v.key) === undefined
  )
  if (missing.length > 0) {
    throw Errors.badRequest(
      `Missing required template variables: ${missing.map((v) => v.key).join(", ")}`
    )
  }

  const localeStringsRaw: Record<
    string,
    Record<string, string>
  > = template.localeStrings ? JSON.parse(template.localeStrings) : {}
  const available = Object.keys(localeStringsRaw)
  const resolvedLocale = resolveLocale(
    locale,
    available,
    template.defaultLocale
  )
  const localeStrings = getLocaleStrings(
    localeStringsRaw,
    resolvedLocale,
    template.defaultLocale
  )

  const content: Record<string, unknown> = JSON.parse(template.content)
  return renderValue(content, data, localeStrings)
}
