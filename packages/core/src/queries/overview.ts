import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { ApiClient, InferRequestType } from "@renderical/api-client/client"
import { unwrap } from "@renderical/api-client/client"
import { useApiClient } from "@renderical/api-client/context"

import { inboxKeys } from "./inbox"

export const overviewKeys = {
  all: ["overview"] as const,
  overview: () => [...overviewKeys.all] as const,
}

export function useOverview() {
  const client = useApiClient()
  return useQuery({
    queryKey: overviewKeys.overview(),
    queryFn: () => unwrap(client.api.overview.$get()),
    refetchInterval: 60_000,
  })
}

export function useSendTest() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => unwrap(client.api.overview["test-send"].$post()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: overviewKeys.all })
      qc.invalidateQueries({ queryKey: inboxKeys.all })
    },
  })
}

export function useOnboarding() {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (
      body: InferRequestType<ApiClient["api"]["onboarding"]["$patch"]>["json"]
    ) => unwrap(client.api.onboarding.$patch({ json: body })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: overviewKeys.all })
    },
  })
}
