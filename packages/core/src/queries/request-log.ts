import { useQuery } from "@tanstack/react-query"

import { toQuery, unwrap } from "@notifro/api-client/client"
import { useApiClient } from "@notifro/api-client/context"
import type { ListParams } from "@notifro/api-client/types"

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
