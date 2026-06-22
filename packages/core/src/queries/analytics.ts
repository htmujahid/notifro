import { useQuery } from "@tanstack/react-query"

import type { ApiClient, InferRequestType } from "@notifro/api-client/client"
import { toQuery, unwrap } from "@notifro/api-client/client"
import { useApiClient } from "@notifro/api-client/context"

export const analyticsKeys = {
  all: ["analytics"] as const,
  summary: (params: Record<string, string | undefined>) =>
    [...analyticsKeys.all, "summary", params] as const,
  timeseries: (params: Record<string, string | undefined>) =>
    [...analyticsKeys.all, "timeseries", params] as const,
  channels: (params: Record<string, string | undefined>) =>
    [...analyticsKeys.all, "channels", params] as const,
}

export function useAnalyticsSummary(
  params: InferRequestType<
    ApiClient["api"]["analytics"]["summary"]["$get"]
  >["query"] = {}
) {
  const client = useApiClient()
  const p: Record<string, string | undefined> = {
    from: params.from,
    to: params.to,
    channel: params.channel,
  }
  return useQuery({
    queryKey: analyticsKeys.summary(p),
    queryFn: () =>
      unwrap(client.api.analytics.summary.$get({ query: toQuery(p) })),
    staleTime: 60_000,
  })
}

export function useAnalyticsTimeseries(
  params: InferRequestType<
    ApiClient["api"]["analytics"]["timeseries"]["$get"]
  >["query"] = {}
) {
  const client = useApiClient()
  const p: Record<string, string | undefined> = {
    from: params.from,
    to: params.to,
    granularity: params.granularity,
    channel: params.channel,
  }
  return useQuery({
    queryKey: analyticsKeys.timeseries(p),
    queryFn: () =>
      unwrap(client.api.analytics.timeseries.$get({ query: toQuery(p) })),
    staleTime: 60_000,
  })
}

export function useAnalyticsChannels(
  params: InferRequestType<
    ApiClient["api"]["analytics"]["channels"]["$get"]
  >["query"] = {}
) {
  const client = useApiClient()
  const p: Record<string, string | undefined> = {
    from: params.from,
    to: params.to,
  }
  return useQuery({
    queryKey: analyticsKeys.channels(p),
    queryFn: () =>
      unwrap(client.api.analytics.channels.$get({ query: toQuery(p) })),
    staleTime: 60_000,
  })
}
