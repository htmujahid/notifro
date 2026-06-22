import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"

import { toQuery, unwrap } from "@renderical/api-client/client"
import { useApiClient } from "@renderical/api-client/context"
import type { ListParams } from "@renderical/api-client/types"

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
  const client = useApiClient()
  return useInfiniteQuery({
    queryKey: webhookKeys.list(params),
    queryFn: ({ pageParam }) =>
      unwrap(
        client.api.channels.webhooks.$get({
          query: toQuery({
            ...params,
            ...(pageParam ? { cursor: pageParam as string } : {}),
          }),
        })
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

export function useCreateWebhook() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateWebhookInput) =>
      unwrap(client.api.channels.webhooks.$post({ json: input })),
    onSuccess: () => qc.invalidateQueries({ queryKey: webhookKeys.lists() }),
  })
}

export function useUpdateWebhook(id: string) {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateWebhookInput) =>
      unwrap(
        client.api.channels.webhooks[":id"].$patch({
          param: { id },
          json: input,
        })
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: webhookKeys.lists() }),
  })
}

export function useDeleteWebhook() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(client.api.channels.webhooks[":id"].$delete({ param: { id } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: webhookKeys.lists() }),
  })
}

export function useTestWebhook() {
  const client = useApiClient()
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(client.api.channels.webhooks[":id"].test.$post({ param: { id } })),
  })
}
