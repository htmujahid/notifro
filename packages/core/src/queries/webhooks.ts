import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"

import type {
  ApiClient,
  InferRequestType,
  InferResponseType,
} from "@notifro/api-client/client"
import { toQuery, unwrap } from "@notifro/api-client/client"
import { useApiClient } from "@notifro/api-client/context"
import type { ListParams } from "@notifro/api-client/types"

export type WebhookEndpoint = InferResponseType<
  ApiClient["api"]["channels"]["webhooks"]["$get"],
  200
>["data"][number]

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
    mutationFn: (
      input: InferRequestType<
        ApiClient["api"]["channels"]["webhooks"]["$post"]
      >["json"]
    ) => unwrap(client.api.channels.webhooks.$post({ json: input })),
    onSuccess: () => qc.invalidateQueries({ queryKey: webhookKeys.lists() }),
  })
}

export function useUpdateWebhook(id: string) {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (
      input: InferRequestType<
        ApiClient["api"]["channels"]["webhooks"][":id"]["$patch"]
      >["json"]
    ) =>
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
