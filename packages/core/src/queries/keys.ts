import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"

import type { ApiClient, InferRequestType } from "@renderical/api-client/client"
import { toQuery, unwrap } from "@renderical/api-client/client"
import { useApiClient } from "@renderical/api-client/context"
import type { ListParams } from "@renderical/api-client/types"

export const apiKeyKeys = {
  all: ["developers"] as const,
  apiKeys: () => [...apiKeyKeys.all, "keys"] as const,
  apiKeyList: (params: ListParams) =>
    [...apiKeyKeys.apiKeys(), params] as const,
}

export function useApiKeys(params: ListParams = {}) {
  const client = useApiClient()
  return useInfiniteQuery({
    queryKey: apiKeyKeys.apiKeyList(params),
    queryFn: ({ pageParam }) =>
      unwrap(
        client.api.keys.$get({
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

export function useCreateApiKey() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: InferRequestType<ApiClient["api"]["keys"]["$post"]>["json"]) =>
      unwrap(client.api.keys.$post({ json: body })),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: apiKeyKeys.apiKeys() }),
  })
}

export function useRevokeApiKey() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(client.api.keys[":id"].$delete({ param: { id } })),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: apiKeyKeys.apiKeys() }),
  })
}
