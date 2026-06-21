import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { useApiClient } from "@renderical/api-client/context"
import type {
  ApiKey,
  ApiKeyWithSecret,
  ApiRequestLog,
  ListParams,
  ListResponse,
} from "@renderical/api-client/types"

export const developerKeys = {
  all: ["developers"] as const,
  apiKeys: () => [...developerKeys.all, "keys"] as const,
  apiKeyList: (params: ListParams) =>
    [...developerKeys.apiKeys(), params] as const,
  requestLog: (params: ListParams) =>
    [...developerKeys.all, "request-log", params] as const,
}

export function useApiKeys(params: ListParams = {}) {
  const api = useApiClient()
  return useInfiniteQuery({
    queryKey: developerKeys.apiKeyList(params),
    queryFn: ({ pageParam }) =>
      api.get<ListResponse<ApiKey>>("/api/keys", {
        ...params,
        ...(pageParam ? { cursor: pageParam as string } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

export function useCreateApiKey() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; mode: "live" | "test" }) =>
      api.post<ApiKeyWithSecret>("/api/keys", body),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: developerKeys.apiKeys() }),
  })
}

export function useRevokeApiKey() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/keys/${id}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: developerKeys.apiKeys() }),
  })
}

export function useRequestLog(params: ListParams = {}) {
  const api = useApiClient()
  return useQuery({
    queryKey: developerKeys.requestLog(params),
    queryFn: () =>
      api.get<ListResponse<ApiRequestLog>>("/api/request-log", params),
    refetchInterval: 30_000,
  })
}
