import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"

import type { ApiClient, InferRequestType } from "@renderical/api-client/client"
import { toQuery, unwrap } from "@renderical/api-client/client"
import { useApiClient } from "@renderical/api-client/context"
import type { ListParams } from "@renderical/api-client/types"

export const snippetKeys = {
  all: ["snippets"] as const,
  lists: () => [...snippetKeys.all, "list"] as const,
  list: (params: ListParams) => [...snippetKeys.lists(), params] as const,
  detail: (id: string) => [...snippetKeys.all, "detail", id] as const,
}

export function useSnippets(params: ListParams = {}) {
  const client = useApiClient()
  return useInfiniteQuery({
    queryKey: snippetKeys.list(params),
    queryFn: ({ pageParam }) =>
      unwrap(
        client.api.snippets.$get({
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

export function useCreateSnippet() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: InferRequestType<ApiClient["api"]["snippets"]["$post"]>["json"]) =>
      unwrap(client.api.snippets.$post({ json: body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: snippetKeys.lists() }),
  })
}

export function useUpdateSnippet() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: { id: string } & InferRequestType<ApiClient["api"]["snippets"][":id"]["$patch"]>["json"]) =>
      unwrap(
        client.api.snippets[":id"].$patch({
          param: { id },
          json: body,
        })
      ),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: snippetKeys.lists() })
      qc.invalidateQueries({ queryKey: snippetKeys.detail(id) })
    },
  })
}

export function useDeleteSnippet() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(client.api.snippets[":id"].$delete({ param: { id } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: snippetKeys.lists() }),
  })
}
