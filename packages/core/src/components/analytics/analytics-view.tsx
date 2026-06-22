import { useState } from "react"

import { BellIcon } from "lucide-react"

import { PageHeader } from "@renderical/ui-primitives/components/page-header"
import {
  StatCard,
  StatCardGrid,
} from "@renderical/ui-primitives/components/stat-card"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@renderical/ui/components/card"

import {
  useAnalyticsChannels,
  useAnalyticsSummary,
  useAnalyticsTimeseries,
} from "../../queries/analytics"

type Granularity = "hour" | "day" | "week"

function pct(n: number) {
  return `${n.toFixed(1)}%`
}

function formatDate(iso: string) {
  return new Date(iso).toISOString().split("T")[0]
}

function toIso(dateStr: string, endOfDay = false): string {
  if (endOfDay) return `${dateStr}T23:59:59.999Z`
  return `${dateStr}T00:00:00.000Z`
}

export function AnalyticsView() {
  const [from, setFrom] = useState(() =>
    formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
  )
  const [to, setTo] = useState(() => formatDate(new Date().toISOString()))
  const [granularity, setGranularity] = useState<Granularity>("day")

  const fromIso = toIso(from)
  const toIso_ = toIso(to, true)

  const { data: summary, isLoading: summaryLoading } = useAnalyticsSummary({
    from: fromIso,
    to: toIso_,
  })
  const { data: timeseries, isLoading: tsLoading } = useAnalyticsTimeseries({
    from: fromIso,
    to: toIso_,
    granularity,
  })
  const { data: channels, isLoading: channelsLoading } = useAnalyticsChannels({
    from: fromIso,
    to: toIso_,
  })

  const summaryStats = summary
    ? [
        { label: "Sent", value: summary.sent.toLocaleString() },
        { label: "Delivered", value: summary.delivered.toLocaleString() },
        { label: "Delivery rate", value: pct(summary.deliveryRate) },
      ]
    : null

  const tsData = timeseries?.data ?? []
  const maxSent = Math.max(...tsData.map((d) => d.sent), 1)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Analytics"
        description="Delivery status and performance across all channels."
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <div className="flex items-center gap-1">
            <label
              htmlFor="from-date"
              className="text-muted-foreground text-xs"
            >
              From
            </label>
            <input
              id="from-date"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded border border-border bg-background px-2 py-1 text-xs"
            />
          </div>
          <div className="flex items-center gap-1">
            <label htmlFor="to-date" className="text-muted-foreground text-xs">
              To
            </label>
            <input
              id="to-date"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded border border-border bg-background px-2 py-1 text-xs"
            />
          </div>
          <select
            value={granularity}
            onChange={(e) => setGranularity(e.target.value as Granularity)}
            className="rounded border border-border bg-background px-2 py-1 text-xs"
          >
            <option value="hour">Hourly</option>
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
          </select>
        </div>
      </PageHeader>

      {summaryLoading ? (
        <StatCardGrid cols={3}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </StatCardGrid>
      ) : summaryStats ? (
        <StatCardGrid cols={3}>
          {summaryStats.map(({ label, value }) => (
            <StatCard key={label} label={label} value={value} size="sm" />
          ))}
        </StatCardGrid>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl py-8 ring-1 ring-foreground/10 text-center">
          <BellIcon className="mb-3 size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No data for this period.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardDescription>Timeseries — sent vs delivered</CardDescription>
        </CardHeader>
        <CardContent>
          {tsLoading ? (
            <div className="h-40 rounded bg-muted animate-pulse" />
          ) : tsData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No data for this period.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <svg
                viewBox={`0 0 800 120`}
                className="w-full h-32"
                aria-label="Timeseries chart"
              >
                {tsData.map((d, i) => {
                  const x = 8 + (i / (tsData.length - 1 || 1)) * 784
                  const sentH = (d.sent / maxSent) * 100
                  const delivH = (d.delivered / maxSent) * 100
                  return (
                    <g key={d.period}>
                      <rect
                        x={x - 4}
                        y={112 - sentH}
                        width={5}
                        height={sentH}
                        className="fill-primary/30"
                      />
                      <rect
                        x={x + 1}
                        y={112 - delivH}
                        width={5}
                        height={delivH}
                        className="fill-primary"
                      />
                    </g>
                  )
                })}
              </svg>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="inline-block size-2.5 rounded-sm bg-primary/30" />{" "}
                  Sent
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block size-2.5 rounded-sm bg-primary" />{" "}
                  Delivered
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Delivery by channel</h2>
        {channelsLoading ? (
          <div className="h-32 rounded-xl bg-muted animate-pulse" />
        ) : (channels?.data ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No channel data.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Channel
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Sent
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Delivered
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Rate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {(channels?.data ?? []).map((row) => (
                  <tr
                    key={row.channel}
                    className="transition-colors hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-medium">{row.channel}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {row.sent.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {row.delivered.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-green-700 dark:text-green-400">
                      {pct(row.deliveryRate)}
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
