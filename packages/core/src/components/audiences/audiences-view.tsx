import { Button } from "@workspace/ui/components/button"
import { PlusIcon, UsersIcon, TagIcon } from "lucide-react"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@workspace/ui/components/empty"

const ALL_AUDIENCES = [
  { id: 1, name: "All users", description: "Every registered user in the system", size: 12_480, tags: ["global"], lastUpdated: "Jun 19, 2026" },
  { id: 2, name: "Premium users", description: "Users on a paid subscription plan", size: 3_210, tags: ["billing"], lastUpdated: "Jun 18, 2026" },
  { id: 3, name: "Expiring users", description: "Subscriptions expiring within 7 days", size: 148, tags: ["billing", "dynamic"], lastUpdated: "Jun 19, 2026" },
  { id: 4, name: "Churned users", description: "Users who cancelled in the last 30 days", size: 72, tags: ["retention", "dynamic"], lastUpdated: "Jun 17, 2026" },
  { id: 5, name: "Ops team", description: "Internal operations team members", size: 9, tags: ["internal"], lastUpdated: "Jun 10, 2026" },
  { id: 6, name: "Beta testers", description: "Users enrolled in the beta programme", size: 534, tags: ["product"], lastUpdated: "Jun 15, 2026" },
  { id: 7, name: "High-volume senders", description: "Users sending more than 1k notifications/month", size: 67, tags: ["usage", "dynamic"], lastUpdated: "Jun 19, 2026" },
]

const TAG_STYLES: Record<string, string> = {
  global: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  billing: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  dynamic: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  retention: "bg-red-500/10 text-red-700 dark:text-red-400",
  internal: "bg-muted text-muted-foreground",
  product: "bg-green-500/10 text-green-700 dark:text-green-400",
  usage: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
}

export function AudiencesView() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Audiences</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Segment your recipients into reusable groups for targeted notifications.
          </p>
        </div>
        <Button size="sm" className="gap-1.5">
          <PlusIcon className="size-4" />
          New audience
        </Button>
      </div>

      {ALL_AUDIENCES.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><UsersIcon /></EmptyMedia>
            <EmptyTitle>No audiences yet</EmptyTitle>
            <EmptyDescription>Create audience segments to target groups of recipients for your notifications.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" className="gap-1.5"><PlusIcon className="size-4" />New audience</Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tags</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Size</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {ALL_AUDIENCES.map((a) => (
                <tr key={a.id} className="cursor-pointer transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                        <UsersIcon className="size-3.5 text-muted-foreground" />
                      </div>
                      <span className="font-medium">{a.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{a.description}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {a.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${TAG_STYLES[tag] ?? "bg-muted text-muted-foreground"}`}
                        >
                          <TagIcon className="size-2.5" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                    {a.size.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{a.lastUpdated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
