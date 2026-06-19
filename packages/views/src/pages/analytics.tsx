import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { BellIcon, CheckCircleIcon, XCircleIcon, ClockIcon, TrendingUpIcon, TrendingDownIcon } from "lucide-react"

const STATS = [
  { label: "Total sent", value: "24,831", change: "+8.2%", trend: "up", icon: BellIcon },
  { label: "Delivered", value: "24,406", change: "+8.5%", trend: "up", icon: CheckCircleIcon },
  { label: "Failed", value: "425", change: "-3.1%", trend: "down", icon: XCircleIcon },
  { label: "Avg. delivery time", value: "248ms", change: "-12ms", trend: "up", icon: ClockIcon },
]

const BY_CHANNEL = [
  { channel: "Email", sent: 14_210, delivered: 13_980, failed: 230, rate: "98.4%" },
  { channel: "Slack", sent: 6_430, delivered: 6_420, failed: 10, rate: "99.8%" },
  { channel: "Push", sent: 2_891, delivered: 2_756, failed: 135, rate: "95.3%" },
  { channel: "Webhook", sent: 1_300, delivered: 1_250, failed: 50, rate: "96.2%" },
]

const TOP_NOTIFICATIONS = [
  { name: "Weekly digest", sent: 4_200, rate: "99.1%", channel: "Email" },
  { name: "Payment reminder", sent: 3_810, rate: "97.4%", channel: "Push" },
  { name: "Daily health check", sent: 2_190, rate: "99.9%", channel: "Slack" },
  { name: "New sign-up welcome", sent: 1_940, rate: "98.7%", channel: "Email" },
  { name: "Subscription renewal", sent: 1_320, rate: "95.1%", channel: "Email" },
]

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Delivery performance and engagement across all channels. Last 30 days.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map(({ label, value, change, trend, icon: Icon }) => (
          <Card key={label} size="sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardDescription>{label}</CardDescription>
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl font-bold">{value}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1 text-xs">
                {trend === "up" ? (
                  <TrendingUpIcon className="size-3 text-green-600 dark:text-green-400" />
                ) : (
                  <TrendingDownIcon className="size-3 text-red-600 dark:text-red-400" />
                )}
                <span className={trend === "up" ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
                  {change}
                </span>
                <span className="text-muted-foreground">vs last period</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">Delivery by channel</h2>
          <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Channel</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Sent</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Delivered</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Failed</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {BY_CHANNEL.map((row) => (
                  <tr key={row.channel} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{row.channel}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{row.sent.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{row.delivered.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{row.failed.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-700 dark:text-green-400">{row.rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">Top notifications</h2>
          <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Channel</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Sent</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {TOP_NOTIFICATIONS.map((n) => (
                  <tr key={n.name} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{n.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{n.channel}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{n.sent.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-700 dark:text-green-400">{n.rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
