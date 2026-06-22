import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"

import { toQuery, unwrap } from "@renderical/api-client/client"
import type { ApiClient, InferRequestType } from "@renderical/api-client/client"
import { useApiClient } from "@renderical/api-client/context"
import type { ChainStep, ListParams } from "@renderical/api-client/types"

export type { ChainStep }

export const chainKeys = {
  all: ["chains"] as const,
  lists: () => [...chainKeys.all, "list"] as const,
  list: (params: ListParams) => [...chainKeys.lists(), params] as const,
  detail: (id: string) => [...chainKeys.all, "detail", id] as const,
}

export function useChains(params: ListParams = {}) {
  const client = useApiClient()
  return useInfiniteQuery({
    queryKey: chainKeys.list(params),
    queryFn: ({ pageParam }) =>
      unwrap(
        client.api.routing.chains.$get({
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

export function useCreateChain() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (
      body: InferRequestType<
        ApiClient["api"]["routing"]["chains"]["$post"]
      >["json"]
    ) => unwrap(client.api.routing.chains.$post({ json: body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chainKeys.lists() }),
  })
}

export function useUpdateChain() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: { id: string } & InferRequestType<
      ApiClient["api"]["routing"]["chains"][":id"]["$patch"]
    >["json"]) =>
      unwrap(
        client.api.routing.chains[":id"].$patch({ param: { id }, json: body })
      ),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: chainKeys.lists() })
      qc.invalidateQueries({ queryKey: chainKeys.detail(id) })
    },
  })
}

export function useDeleteChain() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(client.api.routing.chains[":id"].$delete({ param: { id } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chainKeys.lists() }),
  })
}
