import { useApiClient } from "@workspace/api-client/context"
import type { ListParams, ListResponse } from "@workspace/api-client/types"

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"

export interface WebhookEndpoint {
  id: string
  userId: string
  url: string
  secretLast4: string
  headers: Record<string, string> | null
  description: string | null
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface WebhookEndpointWithSecret extends WebhookEndpoint {
  secret: string
}

export interface CreateWebhookInput {
  url: string
  headers?: Record<string, string>
  description?: string
  enabled?: boolean
}

export interface UpdateWebhookInput {
  url?: string
  headers?: Record<string, string> | null
  description?: string | null
  enabled?: boolean
}

export interface WebhookTestResult {
  ok: boolean
  status: number | null
  latencyMs: number
  error?: string
}

export const webhookKeys = {
  all: ["webhooks"] as const,
  lists: () => [...webhookKeys.all, "list"] as const,
  list: (params: ListParams) => [...webhookKeys.lists(), params] as const,
}

export function useWebhooks(params: ListParams = {}) {
  const api = useApiClient()
  return useInfiniteQuery({
    queryKey: webhookKeys.list(params),
    queryFn: ({ pageParam }) =>
      api.get<ListResponse<WebhookEndpoint>>("/api/channels/webhooks", {
        ...params,
        ...(pageParam ? { cursor: pageParam as string } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

export function useCreateWebhook() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateWebhookInput) =>
      api.post<WebhookEndpointWithSecret>("/api/channels/webhooks", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: webhookKeys.lists() }),
  })
}

export function useUpdateWebhook(id: string) {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateWebhookInput) =>
      api.patch<WebhookEndpoint>(`/api/channels/webhooks/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: webhookKeys.lists() }),
  })
}

export function useDeleteWebhook() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ ok: boolean }>(`/api/channels/webhooks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: webhookKeys.lists() }),
  })
}

export function useTestWebhook() {
  const api = useApiClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.post<WebhookTestResult>(`/api/channels/webhooks/${id}/test`),
  })
}
