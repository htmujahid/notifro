import { Badge } from "@workspace/ui/components/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@workspace/ui/components/card"
import { BellIcon, CheckCircleIcon, CalendarIcon, RadioIcon } from "lucide-react"

const STATS = [
  {
    label: "Total Notifications",
    value: "1,284",
    delta: "+12% this week",
    icon: BellIcon,
  },
  {
    label: "Scheduled",
    value: "47",
    delta: "Next: in 3 min",
    icon: CalendarIcon,
  },
  {
    label: "Delivered",
    value: "1,237",
    delta: "99.7% delivery rate",
    icon: CheckCircleIcon,
  },
  {
    label: "Active Channels",
    value: "4",
    delta: "Email, Slack, Push, Webhook",
    icon: RadioIcon,
  },
]

const RECENT_NOTIFICATIONS = [
  { id: 1, title: "Weekly digest", channel: "Email", status: "delivered", sentAt: "Today 09:00" },
  { id: 2, title: "Payment reminder", channel: "Push", status: "delivered", sentAt: "Today 08:30" },
  { id: 3, title: "Low inventory alert", channel: "Slack", status: "delivered", sentAt: "Today 07:15" },
  { id: 4, title: "Subscription renewal", channel: "Email", status: "scheduled", sentAt: "Tomorrow 10:00" },
  { id: 5, title: "Usage limit warning", channel: "Webhook", status: "failed", sentAt: "Yesterday 22:00" },
  { id: 6, title: "Monthly report", channel: "Email", status: "scheduled", sentAt: "Jun 22 08:00" },
]

const STATUS_STYLES: Record<string, string> = {
  delivered: "bg-green-500/10 text-green-700 dark:text-green-400",
  scheduled: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  failed: "bg-destructive/10 text-destructive",
}

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of your notification infrastructure.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map(({ label, value, delta, icon: Icon }) => (
          <Card key={label} size="sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardDescription>{label}</CardDescription>
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl font-bold">{value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{delta}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="mb-4 text-sm font-medium text-foreground">Recent notifications</h2>
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Channel</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {RECENT_NOTIFICATIONS.map((n) => (
                <tr key={n.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{n.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{n.channel}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[n.status]}`}>
                      {n.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{n.sentAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
