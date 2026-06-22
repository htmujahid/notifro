import type { AppType } from "api/app-type"
import { hc } from "hono/client"

import { ApiClientError } from "./error"

export type { InferRequestType, InferResponseType } from "hono/client"

export function createApiClient(baseURL: string) {
  const base = baseURL.replace(/\/$/, "")
  const client = hc<AppType>(base, { init: { credentials: "include" } })
  return Object.assign(client, { baseURL: base })
}

export type ApiClient = ReturnType<typeof createApiClient>

async function parseError(res: Response): Promise<never> {
  let code = "internal_error"
  let message = `HTTP ${res.status}`
  let details: { path?: string[]; message: string }[] | undefined

  try {
    const body = (await res.json()) as {
      error?: {
        code?: string
        message?: string
        details?: { path?: string[]; message: string }[]
      }
    }
    if (body.error) {
      code = body.error.code ?? code
      message = body.error.message ?? message
      details = body.error.details
    }
  } catch {
    // non-JSON body, keep defaults
  }

  throw new ApiClientError(code, message, res.status, details)
}

type AnyJsonResponse = {
  ok: boolean
  status: number
  json: () => Promise<unknown>
}

type ResponseBody<R extends AnyJsonResponse> = Awaited<ReturnType<R["json"]>>

export async function unwrap<R extends AnyJsonResponse>(
  resPromise: Promise<R>
): Promise<ResponseBody<R>> {
  const res = await resPromise
  if (!res.ok) await parseError(res as unknown as Response)
  if (res.status === 204) return undefined as ResponseBody<R>
  return (await res.json()) as ResponseBody<R>
}

export function toQuery(
  params: Record<string, unknown>
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") out[k] = String(v)
  }
  return out
}
