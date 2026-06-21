import type {
  ApiKey,
  ApiKeyWithSecret,
  ApiRequestLog,
  ComposePayload,
  ListResponse,
} from "@workspace/api-client/types"

export interface RendericalClientOptions {
  baseUrl: string
  apiKey: string
}

export interface SendOptions extends ComposePayload {
  sandbox?: boolean
}

export interface SendResult {
  id: string
  status: string
  deliveries: Array<{
    id: string
    channel: string
    status: string
    error: string | null
  }>
  sandboxMode?: boolean
  previews?: Record<string, unknown>
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
    // ignore
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
      const { sandbox, ...rest } = payload
      return request<SendResult>(
        "POST",
        "/api/notifications",
        rest,
        sandbox ? { "X-Renderical-Sandbox": "true" } : undefined
      )
    },

    preview(payload: ComposePayload): Promise<SendResult> {
      return request<SendResult>("POST", "/api/notifications", payload, {
        "X-Renderical-Sandbox": "true",
      })
    },

    listDeliveries(params?: Record<string, string | number>): Promise<
      ListResponse<{
        id: string
        channel: string
        status: string
        error: string | null
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

    keys: {
      list(): Promise<ListResponse<ApiKey>> {
        return request("GET", "/api/keys")
      },
      create(
        name: string,
        mode: "live" | "test" = "live"
      ): Promise<ApiKeyWithSecret> {
        return request("POST", "/api/keys", { name, mode })
      },
      revoke(id: string): Promise<void> {
        return request("DELETE", `/api/keys/${id}`)
      },
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
