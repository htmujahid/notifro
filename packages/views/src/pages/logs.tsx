import { useState } from "react"
import { ScrollIcon, RefreshCwIcon } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@workspace/ui/components/empty"

const ALL_LOGS = [
  { id: "log_01", notification: "Weekly digest", channel: "Email", recipient: "all-users@group", status: "delivered", duration: "312ms", timestamp: "Jun 19, 09:00:04" },
  { id: "log_02", notification: "Payment reminder", channel: "Push", recipient: "user_4821", status: "delivered", duration: "89ms", timestamp: "Jun 19, 08:30:12" },
  { id: "log_03", notification: "Low inventory alert", channel: "Slack", recipient: "#ops-team", status: "delivered", duration: "204ms", timestamp: "Jun 19, 07:15:33" },
  { id: "log_04", notification: "Usage limit warning", channel: "Webhook", recipient: "api.example.com/hook", status: "failed", duration: "5002ms", timestamp: "Jun 18, 22:00:01" },
  { id: "log_05", notification: "New sign-up welcome", channel: "Email", recipient: "new@user.com", status: "delivered", duration: "418ms", timestamp: "Jun 18, 14:20:09" },
  { id: "log_06", notification: "Server alert: high CPU", channel: "Slack", recipient: "#incidents", status: "delivered", duration: "177ms", timestamp: "Jun 18, 11:05:44" },
  { id: "log_07", notification: "Subscription renewal", channel: "Email", recipient: "user_2034", status: "bounced", duration: "1201ms", timestamp: "Jun 18, 10:00:00" },
  { id: "log_08", notification: "Deployment hook", channel: "Webhook", recipient: "ci.internal/deploy", status: "delivered", duration: "95ms", timestamp: "Jun 17, 16:42:11" },
  { id: "log_09", notification: "Monthly invoice reminder", channel: "Email", recipient: "subscribed@group", status: "delivered", duration: "522ms", timestamp: "Jun 17, 10:01:00" },
  { id: "log_10", notification: "Backup webhook ping", channel: "Webhook", recipient: "api.internal/health", status: "failed", duration: "5001ms", timestamp: "Jun 17, 09:45:00" },
]

const TABS = ["All", "Delivered", "Failed", "Bounced"] as const
type Tab = typeof TABS[number]

const STATUS_STYLES: Record<string, string> = {
  delivered: "bg-green-500/10 text-green-700 dark:text-green-400",
  failed: "bg-destructive/10 text-destructive",
  bounced: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
}

export default function LogsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("All")

  const filtered = activeTab === "All"
    ? ALL_LOGS
    : ALL_LOGS.filter((l) => l.status === activeTab.toLowerCase())

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Logs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Delivery history for all outbound notifications.
          </p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5">
          <RefreshCwIcon className="size-4" />
          Refresh
        </Button>
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm transition-colors ${
              activeTab === tab
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><ScrollIcon /></EmptyMedia>
            <EmptyTitle>No {activeTab.toLowerCase()} entries</EmptyTitle>
            <EmptyDescription>Delivery logs will appear here once you start sending notifications.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Notification</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Channel</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Recipient</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Duration</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {filtered.map((l) => (
                <tr key={l.id} className="cursor-pointer transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{l.notification}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.channel}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{l.recipient}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[l.status]}`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{l.duration}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
