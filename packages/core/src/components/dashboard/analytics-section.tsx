import { TrendingUpIcon } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@workspace/ui/components/card"
import { useAnalyticsSummary, useAnalyticsTimeseries } from "../../hooks/analytics"
import type { AnalyticsTimeseriesItem } from "@workspace/api-client/types"

function pct(n: number) {
  return `${n.toFixed(1)}%`
}

function MiniLineChart({ data }: { data: AnalyticsTimeseriesItem[] }) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
        Not enough data for chart
      </div>
    )
  }

  const maxVal = Math.max(...data.map((d) => d.sent), 1)
  const W = 400
  const H = 80
  const padX = 4
  const padY = 6
  const innerW = W - padX * 2
  const innerH = H - padY * 2
  const xStep = innerW / (data.length - 1)

  function buildPath(values: number[]): string {
    return values
      .map((v, i) => {
        const x = padX + i * xStep
        const y = padY + innerH - (v / maxVal) * innerH
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
      })
      .join(' ')
  }

  const sentPath = buildPath(data.map((d) => d.sent))
  const deliveredPath = buildPath(data.map((d) => d.delivered))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24" aria-hidden>
      <path d={sentPath} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary" />
      <path d={deliveredPath} fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" className="text-muted-foreground" />
    </svg>
  )
}

export function AnalyticsSection() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const now = new Date().toISOString()

  const { data: summary, isLoading: summaryLoading } = useAnalyticsSummary({ from: sevenDaysAgo, to: now })
  const { data: timeseries, isLoading: tsLoading } = useAnalyticsTimeseries({ from: sevenDaysAgo, to: now, granularity: 'day' })

  const stats = summary
    ? [
        { label: 'Sent (7d)', value: summary.sent.toLocaleString() },
        { label: 'Delivered', value: summary.delivered.toLocaleString() },
        { label: 'Open rate', value: pct(summary.openRate) },
        { label: 'Click rate', value: pct(summary.clickRate) },
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
          <CardDescription className="text-xs">Sent vs Delivered</CardDescription>
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
              <span className="inline-block h-0.5 w-4 border-t border-dashed border-muted-foreground" /> Delivered
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
