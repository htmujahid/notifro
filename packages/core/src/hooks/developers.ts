import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { toQuery, unwrap } from "@renderical/api-client/client"
import { useApiClient } from "@renderical/api-client/context"
import type { ListParams } from "@renderical/api-client/types"

export const developerKeys = {
  all: ["developers"] as const,
  apiKeys: () => [...developerKeys.all, "keys"] as const,
  apiKeyList: (params: ListParams) =>
    [...developerKeys.apiKeys(), params] as const,
  requestLog: (params: ListParams) =>
    [...developerKeys.all, "request-log", params] as const,
}

export function useApiKeys(params: ListParams = {}) {
  const client = useApiClient()
  return useInfiniteQuery({
    queryKey: developerKeys.apiKeyList(params),
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
    mutationFn: (body: { name: string; mode: "live" | "test" }) =>
      unwrap(client.api.keys.$post({ json: body })),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: developerKeys.apiKeys() }),
  })
}

export function useRevokeApiKey() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(client.api.keys[":id"].$delete({ param: { id } })),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: developerKeys.apiKeys() }),
  })
}

export function useRequestLog(params: ListParams = {}) {
  const client = useApiClient()
  return useQuery({
    queryKey: developerKeys.requestLog(params),
    queryFn: () =>
      unwrap(client.api["request-log"].$get({ query: toQuery(params) })),
    refetchInterval: 30_000,
  })
}
