import { useQuery } from "@tanstack/react-query"

import { toQuery, unwrap } from "@renderical/api-client/client"
import { useApiClient } from "@renderical/api-client/context"
import type { ListParams } from "@renderical/api-client/types"

export const requestLogKeys = {
  all: ["developers"] as const,
  requestLog: (params: ListParams) =>
    [...requestLogKeys.all, "request-log", params] as const,
}

export function useRequestLog(params: ListParams = {}) {
  const client = useApiClient()
  return useQuery({
    queryKey: requestLogKeys.requestLog(params),
    queryFn: () =>
      unwrap(client.api["request-log"].$get({ query: toQuery(params) })),
    refetchInterval: 30_000,
  })
}
