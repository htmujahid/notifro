import { ApiClientError } from "./error"
import type { ListParams } from "./types"

function buildQueryString(params: ListParams): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== "" && v !== null
  )
  if (entries.length === 0) return ""
  return (
    "?" +
    new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()
  )
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

export interface ApiClient {
  baseURL: string
  get<T>(path: string, params?: ListParams): Promise<T>
  post<T>(path: string, body?: unknown): Promise<T>
  patch<T>(path: string, body?: unknown): Promise<T>
  put<T>(path: string, body?: unknown): Promise<T>
  delete<T>(path: string, body?: unknown): Promise<T>
}

export function createApiClient(baseURL: string): ApiClient {
  const base = baseURL.replace(/\/$/, "")

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    params?: ListParams
  ): Promise<T> {
    const qs = params ? buildQueryString(params) : ""
    const url = `${base}${path}${qs}`

    const res = await fetch(url, {
      method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })

    if (!res.ok) {
      await parseError(res)
    }

    if (res.status === 204) {
      return undefined as T
    }

    return res.json() as Promise<T>
  }

  return {
    baseURL: base,
    get: <T>(path: string, params?: ListParams) =>
      request<T>("GET", path, undefined, params),
    post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
    patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
    put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
    delete: <T>(path: string, body?: unknown) =>
      request<T>("DELETE", path, body),
  }
}
