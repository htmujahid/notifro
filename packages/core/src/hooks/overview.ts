import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useApiClient } from "@workspace/api-client/context"
import { inboxKeys } from "./inbox"

export interface OnboardingSteps {
  connect_channel: boolean
  send_test: boolean
  explore_templates: boolean
}

export interface Onboarding {
  complete: boolean
  dismissed: boolean
  steps: OnboardingSteps
}

export interface RecentActivityItem {
  id: string
  subject: string | null
  channels: string
  status: string
  createdAt: string
}

export interface OverviewData {
  channels: number
  sent7d: number
  sent30d: number
  successRate: number
  recentActivity: RecentActivityItem[]
  unreadInbox: number
  onboarding: Onboarding
}

export const overviewKeys = {
  all: ['overview'] as const,
  overview: () => [...overviewKeys.all] as const,
}

export function useOverview() {
  const api = useApiClient()
  return useQuery({
    queryKey: overviewKeys.overview(),
    queryFn: () => api.get<OverviewData>('/api/overview'),
    refetchInterval: 60_000,
  })
}

export function useSendTest() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<{ ok: boolean; notificationId: string }>('/api/overview/test-send'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: overviewKeys.all })
      qc.invalidateQueries({ queryKey: inboxKeys.all })
    },
  })
}

export function useOnboarding() {
  const api = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { dismiss?: boolean; step?: string; completed?: boolean }) =>
      api.patch<{ ok: boolean }>('/api/onboarding', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: overviewKeys.all })
    },
  })
}
