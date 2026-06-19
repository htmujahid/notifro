import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { PlusIcon, BellOffIcon } from "lucide-react"

const ALL_NOTIFICATIONS = [
  { id: 1, title: "Weekly digest", channel: "Email", status: "delivered", audience: "All users", sentAt: "Jun 19, 09:00" },
  { id: 2, title: "Payment reminder", channel: "Push", status: "delivered", audience: "Overdue accounts", sentAt: "Jun 19, 08:30" },
  { id: 3, title: "Low inventory alert", channel: "Slack", status: "delivered", audience: "#ops-team", sentAt: "Jun 19, 07:15" },
  { id: 4, title: "Subscription renewal", channel: "Email", status: "scheduled", audience: "Expiring users", sentAt: "Jun 20, 10:00" },
  { id: 5, title: "Usage limit warning", channel: "Webhook", status: "failed", audience: "api.example.com", sentAt: "Jun 18, 22:00" },
  { id: 6, title: "Monthly report", channel: "Email", status: "scheduled", audience: "Admin team", sentAt: "Jun 22, 08:00" },
  { id: 7, title: "New sign-up welcome", channel: "Email", status: "delivered", audience: "new@user.com", sentAt: "Jun 18, 14:20" },
  { id: 8, title: "Server alert: high CPU", channel: "Slack", status: "delivered", audience: "#incidents", sentAt: "Jun 18, 11:05" },
]

const TABS = ["All", "Scheduled", "Delivered", "Failed"] as const
type Tab = typeof TABS[number]

const STATUS_STYLES: Record<string, string> = {
  delivered: "bg-green-500/10 text-green-700 dark:text-green-400",
  scheduled: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  failed: "bg-destructive/10 text-destructive",
}

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("All")

  const filtered = activeTab === "All"
    ? ALL_NOTIFICATIONS
    : ALL_NOTIFICATIONS.filter((n) => n.status === activeTab.toLowerCase())

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View and manage all your notifications.
          </p>
        </div>
        <Button size="sm" className="gap-1.5">
          <PlusIcon className="size-4" />
          New notification
        </Button>
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm transition-colors border-b-2 -mb-px ${
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
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BellOffIcon className="mb-3 size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No {activeTab.toLowerCase()} notifications.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Channel</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Audience</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {filtered.map((n) => (
                <tr key={n.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
                  <td className="px-4 py-3 font-medium">{n.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{n.channel}</td>
                  <td className="px-4 py-3 text-muted-foreground">{n.audience}</td>
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
      )}
    </div>
  )
}
