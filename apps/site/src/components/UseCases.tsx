import {
  Bot,
  Check,
  type LucideIcon,
  Receipt,
  Sparkles,
  TriangleAlert,
} from "lucide-react"

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@renderical/ui/components/tabs"

interface UseCase {
  id: string
  label: string
  icon: LucideIcon
  title: string
  desc: string
  points: string[]
  rows: {
    channel: string
    status: string
    tone: "delivered" | "opened" | "sent"
  }[]
}

const cases: UseCase[] = [
  {
    id: "transactional",
    label: "Transactional",
    icon: Receipt,
    title: "Receipts, OTPs & password resets",
    desc: "Critical messages that must arrive. Add a fallback chain so a missed push becomes an email becomes an SMS — with idempotency keys so retries never double-send.",
    points: [
      "Idempotency keys prevent duplicates",
      "push → email → SMS fallback",
      "Delivery receipts & bounce handling",
    ],
    rows: [
      { channel: "Push", status: "Delivered", tone: "delivered" },
      { channel: "Email", status: "Opened", tone: "opened" },
      { channel: "SMS", status: "Skipped — push landed", tone: "sent" },
    ],
  },
  {
    id: "alerts",
    label: "Product alerts",
    icon: TriangleAlert,
    title: "Incidents, deploys & usage limits",
    desc: "Route by priority and time. High-severity alerts hit Slack and push instantly; low-priority ones respect quiet hours and roll up into a digest.",
    points: [
      "Priority-based routing rules",
      "Quiet hours & DND windows",
      "Per-channel rate limiting",
    ],
    rows: [
      { channel: "Slack", status: "Delivered", tone: "delivered" },
      { channel: "Push", status: "Delivered", tone: "delivered" },
      { channel: "Email", status: "Queued — quiet hours", tone: "sent" },
    ],
  },
  {
    id: "lifecycle",
    label: "Lifecycle",
    icon: Sparkles,
    title: "Digests, reminders & scheduled sends",
    desc: "Schedule one-off and recurring notifications with cron, delivery windows, and quiet hours. Reuse versioned templates and your brand kit so every send stays on-brand.",
    points: [
      "Recurring sends with cron schedules",
      "Quiet hours & delivery windows",
      "Timezone-aware scheduling",
    ],
    rows: [
      { channel: "Email", status: "Opened", tone: "opened" },
      { channel: "In-App", status: "Delivered", tone: "delivered" },
      { channel: "Web Push", status: "Sent", tone: "sent" },
    ],
  },
  {
    id: "agentic",
    label: "Agentic & ops",
    icon: Bot,
    title: "AI agents & internal tooling",
    desc: "Let agents send through the MCP server within granted scopes — preview-gated and audited. Or wire internal tools to the same compose-once API.",
    points: [
      "Scoped MCP tools for agents",
      "Preview & approval gates",
      "Every send fully audited",
    ],
    rows: [
      { channel: "Slack", status: "Delivered", tone: "delivered" },
      { channel: "Email", status: "Awaiting approval", tone: "sent" },
      { channel: "Webhook", status: "Delivered", tone: "delivered" },
    ],
  },
]

const toneClasses: Record<string, string> = {
  delivered: "bg-green-500/10 text-green-600 dark:text-green-500",
  opened: "bg-primary/10 text-primary",
  sent: "bg-muted text-muted-foreground",
}

export function UseCases() {
  return (
    <Tabs defaultValue="transactional" className="w-full">
      <TabsList className="mx-auto flex h-auto flex-wrap justify-center gap-1 p-1">
        {cases.map((c) => (
          <TabsTrigger
            key={c.id}
            value={c.id}
            className="flex-none gap-1.5 px-3 py-1.5"
          >
            <c.icon className="size-4" />
            {c.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {cases.map((c) => (
        <TabsContent key={c.id} value={c.id} className="mt-10">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h3 className="text-2xl font-semibold tracking-tight">
                {c.title}
              </h3>
              <p className="mt-3 text-muted-foreground">{c.desc}</p>
              <ul className="mt-5 space-y-3 text-sm">
                {c.points.map((p) => (
                  <li key={p} className="flex gap-3">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2 border-b px-1 pb-3">
                <span className="size-2.5 rounded-full bg-muted-foreground/20" />
                <span className="size-2.5 rounded-full bg-muted-foreground/20" />
                <span className="size-2.5 rounded-full bg-muted-foreground/20" />
                <span className="ml-2 font-mono text-xs text-muted-foreground">
                  delivery · {c.id}
                </span>
              </div>
              <div className="divide-y">
                {c.rows.map((r) => (
                  <div
                    key={r.channel}
                    className="flex items-center justify-between py-3"
                  >
                    <span className="text-sm font-medium">{r.channel}</span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${toneClasses[r.tone]}`}
                    >
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  )
}
