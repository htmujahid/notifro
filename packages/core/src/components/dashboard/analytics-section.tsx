import { TrendingUpIcon } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@notifro/ui/components/card"

import {
  useAnalyticsSummary,
  useAnalyticsTimeseries,
} from "../../queries/analytics"
import { MiniLineChart } from "./mini-line-chart"

function pct(n: number) {
  return `${n.toFixed(1)}%`
}

export function AnalyticsSection() {
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString()
  const now = new Date().toISOString()

  const { data: summary, isLoading: summaryLoading } = useAnalyticsSummary({
    from: sevenDaysAgo,
    to: now,
  })
  const { data: timeseries, isLoading: tsLoading } = useAnalyticsTimeseries({
    from: sevenDaysAgo,
    to: now,
    granularity: "day",
  })

  const stats = summary
    ? [
        { label: "Sent (7d)", value: summary.sent.toLocaleString() },
        { label: "Delivered", value: summary.delivered.toLocaleString() },
        { label: "Open rate", value: pct(summary.openRate) },
        { label: "Click rate", value: pct(summary.clickRate) },
      ]
    : null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <TrendingUpIcon className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">Analytics (last 7 days)</h2>
      </div>

      {summaryLoading ? (
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map(({ label, value }) => (
            <Card key={label} size="sm">
              <CardHeader className="pb-1">
                <CardDescription className="text-xs">{label}</CardDescription>
                <CardTitle className="text-xl font-bold">{value}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : null}

      <Card size="sm">
        <CardHeader className="pb-2">
          <CardDescription className="text-xs">
            Sent vs Delivered
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {tsLoading ? (
            <div className="h-24 rounded bg-muted animate-pulse" />
          ) : (
            <MiniLineChart data={timeseries?.data ?? []} />
          )}
          <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-4 bg-primary" /> Sent
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-4 border-t border-dashed border-muted-foreground" />{" "}
              Delivered
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
