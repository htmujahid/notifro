import { Link } from "react-router"
import { BellIcon, CheckCircleIcon, CalendarIcon, RadioIcon, CheckIcon, ArrowRightIcon, Loader2Icon } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { useOverview, useSendTest, useOnboarding } from "@workspace/core/hooks/overview"
import { toast } from "sonner"

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-green-500/10 text-green-700 dark:text-green-400",
  processing: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  failed: "bg-destructive/10 text-destructive",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-2 h-4 w-56" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} size="sm">
            <CardHeader>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function OnboardingChecklist() {
  const { data, isLoading } = useOverview()
  const sendTest = useSendTest()
  const onboarding = useOnboarding()

  if (isLoading || !data) return <DashboardSkeleton />

  const { steps, dismissed } = data.onboarding
  if (dismissed) return null

  const STEPS = [
    {
      key: "connect_channel" as const,
      label: "Connect your first channel",
      description: "Link an email, SMS, or webhook connection to start sending notifications.",
      done: steps.connect_channel,
      action: <Link to="/channels"><Button size="sm" variant="outline">Go to Channels <ArrowRightIcon className="ml-1 size-3" /></Button></Link>,
    },
    {
      key: "send_test" as const,
      label: "Send a test notification",
      description: "Verify your setup by delivering a real in-app notification to yourself.",
      done: steps.send_test,
      action: (
        <Button
          size="sm"
          variant="outline"
          disabled={sendTest.isPending}
          onClick={() =>
            sendTest.mutate(undefined, {
              onSuccess: () => toast.success("Test notification delivered — check your inbox."),
              onError: (err) => toast.error(err instanceof Error ? err.message : "Send failed"),
            })
          }
        >
          {sendTest.isPending ? <Loader2Icon className="mr-1 size-3 animate-spin" /> : null}
          Send test
        </Button>
      ),
    },
    {
      key: "explore_templates" as const,
      label: "Explore templates",
      description: "Browse reusable message templates to speed up future notifications.",
      done: steps.explore_templates,
      action: (
        <Link to="/templates">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onboarding.mutate({ step: "explore_templates", completed: true })}
          >
            Go to Templates <ArrowRightIcon className="ml-1 size-3" />
          </Button>
        </Link>
      ),
    },
  ]

  const completedCount = STEPS.filter((s) => s.done).length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Get started with Renderical</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete these steps to send your first notification. {completedCount}/{STEPS.length} done.
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onboarding.mutate({ dismiss: true })}
          disabled={onboarding.isPending}
        >
          Dismiss
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {STEPS.map((step) => (
          <div
            key={step.key}
            className={`flex items-center gap-4 rounded-xl px-5 py-4 ring-1 transition-colors ${
              step.done ? "bg-muted/30 ring-foreground/5" : "bg-card ring-foreground/10"
            }`}
          >
            <div
              className={`flex size-7 shrink-0 items-center justify-center rounded-full ring-1 ${
                step.done
                  ? "bg-green-500/10 ring-green-500/30 text-green-600 dark:text-green-400"
                  : "bg-muted ring-foreground/10 text-muted-foreground"
              }`}
            >
              {step.done ? <CheckIcon className="size-4" /> : <span className="text-xs font-medium" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${step.done ? "line-through text-muted-foreground" : ""}`}>
                {step.label}
              </p>
              {!step.done && (
                <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
              )}
            </div>
            {!step.done && <div className="shrink-0">{step.action}</div>}
          </div>
        ))}
      </div>

      {completedCount === STEPS.length && (
        <div className="rounded-xl bg-green-500/10 px-5 py-4 text-sm text-green-700 dark:text-green-400 ring-1 ring-green-500/20">
          All steps complete — your notification pipeline is live.{" "}
          <button
            className="underline underline-offset-2"
            onClick={() => onboarding.mutate({ dismiss: true })}
          >
            Hide this checklist
          </button>
        </div>
      )}
    </div>
  )
}

function OverviewMetrics() {
  const { data, isLoading } = useOverview()

  if (isLoading || !data) return <DashboardSkeleton />

  const STATS = [
    { label: "Sent (7d)", value: data.sent7d.toLocaleString(), delta: `${data.sent30d.toLocaleString()} last 30d`, icon: BellIcon },
    { label: "Active channels", value: data.channels.toLocaleString(), delta: "connected & active", icon: RadioIcon },
    { label: "Delivery rate", value: `${data.successRate}%`, delta: "across all channels", icon: CheckCircleIcon },
    { label: "Unread inbox", value: data.unreadInbox.toLocaleString(), delta: "in-app messages", icon: CalendarIcon },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Overview of your notification infrastructure.</p>
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
        {data.recentActivity.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl py-12 ring-1 ring-foreground/10 text-center">
            <BellIcon className="mb-3 size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No notifications sent yet.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Channels</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {data.recentActivity.map((n) => (
                  <tr key={n.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{n.subject ?? "Untitled"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {(JSON.parse(n.channels) as string[]).join(", ")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[n.status] ?? "bg-muted text-muted-foreground"}`}>
                        {n.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(n.createdAt)}</td>
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

export default function DashboardPage() {
  const { data, isLoading } = useOverview()

  if (isLoading || !data) return <DashboardSkeleton />

  const showOnboarding = !data.onboarding.complete && !data.onboarding.dismissed

  return showOnboarding ? <OnboardingChecklist /> : <OverviewMetrics />
}
