import type { AnalyticsTimeseriesItem } from "@workspace/api-client/types"

export function MiniLineChart({ data }: { data: AnalyticsTimeseriesItem[] }) {
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
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`
      })
      .join(" ")
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
