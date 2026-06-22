import { useQuery } from "@tanstack/react-query"

import { toQuery, unwrap } from "@renderical/api-client/client"
import { useApiClient } from "@renderical/api-client/context"

export const analyticsKeys = {
  all: ["analytics"] as const,
  summary: (params: Record<string, string | undefined>) =>
    [...analyticsKeys.all, "summary", params] as const,
  timeseries: (params: Record<string, string | undefined>) =>
    [...analyticsKeys.all, "timeseries", params] as const,
  channels: (params: Record<string, string | undefined>) =>
    [...analyticsKeys.all, "channels", params] as const,
  topTopics: (params: Record<string, string | undefined>) =>
    [...analyticsKeys.all, "top-topics", params] as const,
}

export interface SummaryParams {
  from?: string
  to?: string
  channel?: string
}

export interface TimeseriesParams {
  from?: string
  to?: string
  granularity?: "hour" | "day" | "week"
  channel?: string
}

export interface RangeParams {
  from?: string
  to?: string
}

export function useAnalyticsSummary(params: SummaryParams = {}) {
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

export function useAnalyticsTimeseries(params: TimeseriesParams = {}) {
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

export function useAnalyticsChannels(params: RangeParams = {}) {
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

export function useAnalyticsTopTopics(params: RangeParams = {}) {
  const client = useApiClient()
  const p: Record<string, string | undefined> = {
    from: params.from,
    to: params.to,
  }
  return useQuery({
    queryKey: analyticsKeys.topTopics(p),
    queryFn: () =>
      unwrap(client.api.analytics["top-topics"].$get({ query: toQuery(p) })),
    staleTime: 60_000,
  })
}
