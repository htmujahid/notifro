import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import type { ApiClient, InferRequestType } from "@renderical/api-client/client"
import { toQuery, unwrap } from "@renderical/api-client/client"
import { useApiClient } from "@renderical/api-client/context"
import type { ListParams } from "@renderical/api-client/types"

export const segmentKeys = {
  all: ["segments"] as const,
  lists: () => [...segmentKeys.all, "list"] as const,
  list: (params: ListParams) => [...segmentKeys.lists(), params] as const,
  detail: (id: string) => [...segmentKeys.all, "detail", id] as const,
  preview: (id: string) => [...segmentKeys.all, "preview", id] as const,
}

export function useSegments(params: ListParams = {}) {
  const client = useApiClient()
  return useInfiniteQuery({
    queryKey: segmentKeys.list(params),
    queryFn: ({ pageParam }) =>
      unwrap(
        client.api.segments.$get({
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

export function useSegmentPreview(id: string) {
  const client = useApiClient()
  return useQuery({
    queryKey: segmentKeys.preview(id),
    queryFn: () =>
      unwrap(client.api.segments[":id"].preview.$get({ param: { id } })),
    enabled: !!id,
  })
}

export function useCreateSegment() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: InferRequestType<ApiClient["api"]["segments"]["$post"]>["json"]) =>
      unwrap(client.api.segments.$post({ json: body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: segmentKeys.lists() }),
  })
}

export function useUpdateSegment() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: { id: string } & InferRequestType<ApiClient["api"]["segments"][":id"]["$patch"]>["json"]) =>
      unwrap(client.api.segments[":id"].$patch({ param: { id }, json: body })),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: segmentKeys.lists() })
      qc.invalidateQueries({ queryKey: segmentKeys.detail(id) })
    },
  })
}

export function useDeleteSegment() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(client.api.segments[":id"].$delete({ param: { id } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: segmentKeys.lists() }),
  })
}
