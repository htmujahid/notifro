import type { AppType } from "api/app-type"
import { hc } from "hono/client"

import { ApiClientError } from "./error"

// Re-exported so consumers can derive request/response types from the client
// without taking a direct dependency on `hono`.
export type { InferRequestType, InferResponseType } from "hono/client"

// Compute the heavy hc<AppType> client type ONCE and reuse via the alias so
// consumers don't re-instantiate it at every call site. The `baseURL` field is
// preserved for the few callers that build raw URLs (e.g. MCP, sandbox fetch).
const _typedClient = hc<AppType>("")
export type ApiClient = typeof _typedClient & { baseURL: string }

export function createApiClient(baseURL: string): ApiClient {
  const base = baseURL.replace(/\/$/, "")
  const client = hc<AppType>(base, { init: { credentials: "include" } })
  return Object.assign(client, { baseURL: base })
}

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
    // non-JSON body — keep defaults
  }

  throw new ApiClientError(code, message, res.status, details)
}

/**
 * Structural shape of a Hono `hc` response. Accepting any object with this
 * shape (rather than the exact `ClientResponse` union) lets `unwrap` infer the
 * body from any `$get`/`$post`/... call. The generic distributes over routes
 * that declare multiple status codes (a `ClientResponse` union), so the return
 * type is the union of their JSON bodies.
 */
type AnyJsonResponse = {
  ok: boolean
  status: number
  json: () => Promise<unknown>
}

type ResponseBody<R extends AnyJsonResponse> = Awaited<ReturnType<R["json"]>>

/**
 * Awaits an `hc` call, throwing a structured `ApiClientError` on non-2xx so
 * existing `isApiError()` handling keeps working with React Query. Returns the
 * parsed JSON body, or `undefined` for 204 responses.
 */
export async function unwrap<R extends AnyJsonResponse>(
  resPromise: Promise<R>
): Promise<ResponseBody<R>> {
  const res = await resPromise
  if (!res.ok) await parseError(res as unknown as Response)
  if (res.status === 204) return undefined as ResponseBody<R>
  return (await res.json()) as ResponseBody<R>
}

/**
 * Serializes list/query params for `hc`'s `$get({ query })`, which expects
 * string values. Drops `undefined`/`null`/empty entries (mirrors the previous
 * fetch client's query-string builder).
 */
export function toQuery(
  params: Record<string, unknown>
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") out[k] = String(v)
  }
  return out
}
