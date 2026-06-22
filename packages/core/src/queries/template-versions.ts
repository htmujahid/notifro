import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"

import { toQuery, unwrap } from "@renderical/api-client/client"
import { useApiClient } from "@renderical/api-client/context"
import type { ListParams } from "@renderical/api-client/types"

export const templateVersionKeys = {
  all: ["template-versions"] as const,
  list: (templateId: string, params: ListParams = {}) =>
    [...templateVersionKeys.all, "list", templateId, params] as const,
}

export function useTemplateVersions(
  templateId: string,
  params: ListParams = {}
) {
  const client = useApiClient()
  return useInfiniteQuery({
    queryKey: templateVersionKeys.list(templateId, params),
    queryFn: ({ pageParam }) =>
      unwrap(
        client.api.templates[":id"].versions.$get({
          param: { id: templateId },
          query: toQuery({
            ...params,
            ...(pageParam ? { cursor: pageParam as string } : {}),
          }),
        })
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: !!templateId,
  })
}

export function useRestoreTemplateVersion() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      templateId,
      version,
    }: {
      templateId: string
      version: number
    }) =>
      unwrap(
        client.api.templates[":id"].versions[":version"].restore.$post({
          param: { id: templateId, version: String(version) },
        })
      ),
    onSuccess: (_, { templateId }) => {
      qc.invalidateQueries({
        queryKey: templateVersionKeys.all,
      })
      qc.invalidateQueries({
        queryKey: ["templates", "detail", templateId],
      })
      qc.invalidateQueries({
        queryKey: ["templates", "list"],
      })
    },
  })
}
