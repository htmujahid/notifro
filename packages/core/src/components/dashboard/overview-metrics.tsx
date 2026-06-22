import {
  BellIcon,
  CalendarIcon,
  CheckCircleIcon,
  RadioIcon,
} from "lucide-react"

import { PageHeader } from "@notifro/ui-primitives/components/page-header"
import {
  StatCard,
  StatCardGrid,
} from "@notifro/ui-primitives/components/stat-card"

import { useOverview } from "../../queries/overview"
import { AnalyticsSection } from "./analytics-section"
import { DashboardSkeleton } from "./dashboard-skeleton"
import { RecentNotificationsTable } from "./recent-notifications-table"

export function OverviewMetrics() {
  const { data, isLoading } = useOverview()

  if (isLoading || !data) return <DashboardSkeleton />

  const STATS = [
    {
      label: "Sent (7d)",
      value: data.sent7d.toLocaleString(),
      delta: `${data.sent30d.toLocaleString()} last 30d`,
      icon: BellIcon,
    },
    {
      label: "Active channels",
      value: data.channels.toLocaleString(),
      delta: "connected & active",
      icon: RadioIcon,
    },
    {
      label: "Delivery rate",
      value: `${data.successRate}%`,
      delta: "across all channels",
      icon: CheckCircleIcon,
    },
    {
      label: "Unread inbox",
      value: data.unreadInbox.toLocaleString(),
      delta: "in-app messages",
      icon: CalendarIcon,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your notification infrastructure."
      />

      <StatCardGrid cols={4}>
        {STATS.map(({ label, value, delta, icon }) => (
          <StatCard
            key={label}
            label={label}
            value={value}
            description={delta}
            icon={icon}
          />
        ))}
      </StatCardGrid>

      <AnalyticsSection />

      <div>
        <h2 className="mb-4 text-sm font-medium text-foreground">
          Recent notifications
        </h2>
        {data.recentActivity.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl py-12 ring-1 ring-foreground/10 text-center">
            <BellIcon className="mb-3 size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No notifications sent yet.
            </p>
          </div>
        ) : (
          <RecentNotificationsTable data={data.recentActivity} />
        )}
      </div>
    </div>
  )
}
