import { useApiClient } from "@workspace/api-client/context"
import type {
  AnalyticsChannelRow,
  AnalyticsSummary,
  AnalyticsTimeseriesItem,
  AnalyticsTopicRow,
} from "@workspace/api-client/types"

import { useQuery } from "@tanstack/react-query"

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

function toQueryString(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined) as [
    string,
    string,
  ][]
  if (entries.length === 0) return ""
  return "?" + new URLSearchParams(entries).toString()
}

export function useAnalyticsSummary(params: SummaryParams = {}) {
  const api = useApiClient()
  const p: Record<string, string | undefined> = {
    from: params.from,
    to: params.to,
    channel: params.channel,
  }
  return useQuery({
    queryKey: analyticsKeys.summary(p),
    queryFn: () =>
      api.get<AnalyticsSummary>(`/api/analytics/summary${toQueryString(p)}`),
    staleTime: 60_000,
  })
}

export function useAnalyticsTimeseries(params: TimeseriesParams = {}) {
  const api = useApiClient()
  const p: Record<string, string | undefined> = {
    from: params.from,
    to: params.to,
    granularity: params.granularity,
    channel: params.channel,
  }
  return useQuery({
    queryKey: analyticsKeys.timeseries(p),
    queryFn: () =>
      api.get<{ data: AnalyticsTimeseriesItem[] }>(
        `/api/analytics/timeseries${toQueryString(p)}`
      ),
    staleTime: 60_000,
  })
}

export function useAnalyticsChannels(params: RangeParams = {}) {
  const api = useApiClient()
  const p: Record<string, string | undefined> = {
    from: params.from,
    to: params.to,
  }
  return useQuery({
    queryKey: analyticsKeys.channels(p),
    queryFn: () =>
      api.get<{ data: AnalyticsChannelRow[] }>(
        `/api/analytics/channels${toQueryString(p)}`
      ),
    staleTime: 60_000,
  })
}

export function useAnalyticsTopTopics(params: RangeParams = {}) {
  const api = useApiClient()
  const p: Record<string, string | undefined> = {
    from: params.from,
    to: params.to,
  }
  return useQuery({
    queryKey: analyticsKeys.topTopics(p),
    queryFn: () =>
      api.get<{ data: AnalyticsTopicRow[] }>(
        `/api/analytics/top-topics${toQueryString(p)}`
      ),
    staleTime: 60_000,
  })
}
