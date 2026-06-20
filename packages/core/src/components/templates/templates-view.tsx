import { Button } from "@workspace/ui/components/button"
import { PlusIcon, FileTextIcon, MailIcon, BellIcon, MessageSquareIcon, WebhookIcon } from "lucide-react"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@workspace/ui/components/empty"

const CHANNEL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Email: MailIcon,
  Push: BellIcon,
  Slack: MessageSquareIcon,
  Webhook: WebhookIcon,
}

const ALL_TEMPLATES = [
  { id: 1, name: "Welcome email", channel: "Email", type: "Transactional", lastModified: "Jun 18, 2026", usedBy: 3 },
  { id: 2, name: "Payment received", channel: "Email", type: "Transactional", lastModified: "Jun 15, 2026", usedBy: 1 },
  { id: 3, name: "Subscription expiring", channel: "Push", type: "Reminder", lastModified: "Jun 14, 2026", usedBy: 2 },
  { id: 4, name: "Weekly digest", channel: "Email", type: "Digest", lastModified: "Jun 12, 2026", usedBy: 1 },
  { id: 5, name: "Incident alert", channel: "Slack", type: "Alert", lastModified: "Jun 10, 2026", usedBy: 4 },
  { id: 6, name: "Low inventory", channel: "Slack", type: "Alert", lastModified: "Jun 8, 2026", usedBy: 2 },
  { id: 7, name: "Password reset", channel: "Email", type: "Transactional", lastModified: "Jun 5, 2026", usedBy: 1 },
  { id: 8, name: "Deployment hook", channel: "Webhook", type: "System", lastModified: "Jun 3, 2026", usedBy: 1 },
]

const TYPE_STYLES: Record<string, string> = {
  Transactional: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  Reminder: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  Digest: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  Alert: "bg-red-500/10 text-red-700 dark:text-red-400",
  System: "bg-muted text-muted-foreground",
}

export function TemplatesView() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Templates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reusable notification templates across all channels.
          </p>
        </div>
        <Button size="sm" className="gap-1.5">
          <PlusIcon className="size-4" />
          New template
        </Button>
      </div>

      {ALL_TEMPLATES.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><FileTextIcon /></EmptyMedia>
            <EmptyTitle>No templates yet</EmptyTitle>
            <EmptyDescription>Create reusable message templates to keep your notifications consistent across channels.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" className="gap-1.5"><PlusIcon className="size-4" />New template</Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Channel</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Used by</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last modified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {ALL_TEMPLATES.map((t) => {
                const Icon = CHANNEL_ICONS[t.channel] ?? FileTextIcon
                return (
                  <tr key={t.id} className="cursor-pointer transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                          <Icon className="size-3.5 text-muted-foreground" />
                        </div>
                        <span className="font-medium">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{t.channel}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLES[t.type]}`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {t.usedBy} {t.usedBy === 1 ? "schedule" : "schedules"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{t.lastModified}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
