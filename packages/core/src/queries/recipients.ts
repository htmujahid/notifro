import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"

import type { ApiClient, InferRequestType } from "@renderical/api-client/client"
import { toQuery, unwrap } from "@renderical/api-client/client"
import { useApiClient } from "@renderical/api-client/context"
import type { ListParams } from "@renderical/api-client/types"

export const recipientKeys = {
  all: ["recipients"] as const,
  lists: () => [...recipientKeys.all, "list"] as const,
  list: (params: ListParams) => [...recipientKeys.lists(), params] as const,
  detail: (id: string) => [...recipientKeys.all, "detail", id] as const,
}

export function useRecipients(params: ListParams = {}) {
  const client = useApiClient()
  return useInfiniteQuery({
    queryKey: recipientKeys.list(params),
    queryFn: ({ pageParam }) =>
      unwrap(
        client.api.recipients.$get({
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

export function useCreateRecipient() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: InferRequestType<ApiClient["api"]["recipients"]["$post"]>["json"]) =>
      unwrap(client.api.recipients.$post({ json: body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: recipientKeys.lists() }),
  })
}

export function useIdentifyRecipient() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: InferRequestType<ApiClient["api"]["recipients"]["identify"]["$post"]>["json"]) =>
      unwrap(client.api.recipients.identify.$post({ json: body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: recipientKeys.lists() }),
  })
}

export function useDeleteRecipient() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(client.api.recipients[":id"].$delete({ param: { id } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: recipientKeys.lists() }),
  })
}
