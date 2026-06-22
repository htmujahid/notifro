import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"

import type { ApiClient, InferRequestType, InferResponseType } from "@renderical/api-client/client"
import { toQuery, unwrap } from "@renderical/api-client/client"
import { useApiClient } from "@renderical/api-client/context"
import type { ListParams } from "@renderical/api-client/types"

export type Connection = InferResponseType<ApiClient["api"]["connections"]["$get"], 200>["data"][number]
export type CreateConnectionInput = InferRequestType<ApiClient["api"]["connections"]["$post"]>["json"]

export const connectionKeys = {
  all: ["connections"] as const,
  lists: () => [...connectionKeys.all, "list"] as const,
  list: (params: ListParams) => [...connectionKeys.lists(), params] as const,
  detail: (id: string) => [...connectionKeys.all, "detail", id] as const,
}

export function useConnections(params: ListParams = {}) {
  const client = useApiClient()
  return useInfiniteQuery({
    queryKey: connectionKeys.list(params),
    queryFn: ({ pageParam }) =>
      unwrap(
        client.api.connections.$get({
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

export function useCreateConnection() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: InferRequestType<ApiClient["api"]["connections"]["$post"]>["json"]) =>
      unwrap(client.api.connections.$post({ json: input })),
    onSuccess: () => qc.invalidateQueries({ queryKey: connectionKeys.lists() }),
  })
}

export function useUpdateConnection(id: string) {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: InferRequestType<ApiClient["api"]["connections"][":id"]["$patch"]>["json"]) =>
      unwrap(
        client.api.connections[":id"].$patch({ param: { id }, json: input })
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: connectionKeys.lists() })
      qc.invalidateQueries({ queryKey: connectionKeys.detail(id) })
    },
  })
}

export function useDeleteConnection() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(client.api.connections[":id"].$delete({ param: { id } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: connectionKeys.lists() }),
  })
}

export function useConnectionHealth(id: string) {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      unwrap(client.api.connections[":id"].health.$post({ param: { id } })),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: connectionKeys.detail(id) }),
  })
}
