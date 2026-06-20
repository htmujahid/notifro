import { useOverview } from "../../hooks/overview"
import { DashboardSkeleton } from "./dashboard-skeleton"
import { OnboardingChecklist } from "./onboarding-checklist"
import { OverviewMetrics } from "./overview-metrics"

export function DashboardView() {
  const { data, isLoading } = useOverview()

  if (isLoading || !data) return <DashboardSkeleton />

  const showOnboarding = !data.onboarding.complete && !data.onboarding.dismissed

  return showOnboarding ? <OnboardingChecklist /> : <OverviewMetrics />
}
