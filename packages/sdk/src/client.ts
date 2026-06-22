import type {
  ApiRequestLog,
  ComposePayload,
  ListResponse,
} from "@renderical/api-client/types"

export interface RendericalClientOptions {
  baseUrl: string
  apiKey: string
}

export type SendOptions = ComposePayload

export interface DeliveryResult {
  id: string
  channel: string
  status: string
  error: string | null
}

export interface SendResult {
  id: string
  status: string
  deliveries: DeliveryResult[]
  sendAt?: string
  scheduled?: boolean
}

async function parseError(res: Response): Promise<never> {
  let code = "internal_error"
  let message = `HTTP ${res.status}`
  try {
    const body = (await res.json()) as {
      error?: { code?: string; message?: string }
    }
    if (body.error) {
      code = body.error.code ?? code
      message = body.error.message ?? message
    }
  } catch {
    message = `HTTP ${res.status}`
  }
  const err = new Error(message)
  ;(err as Error & { code: string }).code = code
  throw err
}

export function createRendericalClient(options: RendericalClientOptions) {
  const base = options.baseUrl.replace(/\/$/, "")
  const apiKey = options.apiKey

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>
  ): Promise<T> {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...extraHeaders,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
    if (!res.ok) await parseError(res)
    if (res.status === 204) return undefined as T
    return res.json() as Promise<T>
  }

  return {
    send(payload: SendOptions): Promise<SendResult> {
      return request<SendResult>("POST", "/api/notifications", payload)
    },

    listDeliveries(params?: Record<string, string | number>): Promise<
      ListResponse<{
        id: string
        channel: string
        status: string
        lastError: string | null
        createdAt: string
      }>
    > {
      const qs = params
        ? "?" +
          new URLSearchParams(
            Object.entries(params).map(([k, v]) => [k, String(v)])
          ).toString()
        : ""
      return request("GET", `/api/deliveries${qs}`)
    },

    requestLog(
      params?: Record<string, string | number>
    ): Promise<ListResponse<ApiRequestLog>> {
      const qs = params
        ? "?" +
          new URLSearchParams(
            Object.entries(params).map(([k, v]) => [k, String(v)])
          ).toString()
        : ""
      return request("GET", `/api/request-log${qs}`)
    },
  }
}

export type RendericalClient = ReturnType<typeof createRendericalClient>
