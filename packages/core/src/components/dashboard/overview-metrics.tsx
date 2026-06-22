import {
  BellIcon,
  CalendarIcon,
  CheckCircleIcon,
  RadioIcon,
} from "lucide-react"

import { PageHeader } from "@renderical/ui-primitives/components/page-header"
import {
  StatCard,
  StatCardGrid,
} from "@renderical/ui-primitives/components/stat-card"

import { useOverview } from "../../queries/overview"
import { AnalyticsSection } from "./analytics-section"
import { DashboardSkeleton } from "./dashboard-skeleton"

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-green-500/10 text-green-700 dark:text-green-400",
  processing: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  failed: "bg-destructive/10 text-destructive",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

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
          <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Channels
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {data.recentActivity.map((n) => (
                  <tr
                    key={n.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">
                      {n.subject ?? "Untitled"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {(JSON.parse(n.channels) as string[]).join(", ")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[n.status] ?? "bg-muted text-muted-foreground"}`}
                      >
                        {n.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(n.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
