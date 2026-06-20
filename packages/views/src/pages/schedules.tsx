import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { PlusIcon, CalendarXIcon, PauseIcon, PlayIcon, Trash2Icon } from "lucide-react"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@workspace/ui/components/empty"

const SCHEDULES = [
  {
    id: 1,
    name: "Weekly digest",
    cron: "0 9 * * 1",
    description: "Every Monday at 9 AM",
    channel: "Email",
    audience: "All users",
    active: true,
    nextRun: "Jun 23, 09:00",
  },
  {
    id: 2,
    name: "Daily health check",
    cron: "0 8 * * *",
    description: "Every day at 8 AM",
    channel: "Slack",
    audience: "#ops-team",
    active: true,
    nextRun: "Jun 20, 08:00",
  },
  {
    id: 3,
    name: "Monthly invoice reminder",
    cron: "0 10 1 * *",
    description: "1st of every month at 10 AM",
    channel: "Email",
    audience: "Subscribed users",
    active: false,
    nextRun: "Jul 1, 10:00",
  },
  {
    id: 4,
    name: "Subscription expiry alert",
    cron: "0 9 * * *",
    description: "Daily for users expiring in 7 days",
    channel: "Push",
    audience: "Expiring users",
    active: true,
    nextRun: "Jun 20, 09:00",
  },
  {
    id: 5,
    name: "Backup webhook ping",
    cron: "*/15 * * * *",
    description: "Every 15 minutes",
    channel: "Webhook",
    audience: "api.internal/health",
    active: false,
    nextRun: "Paused",
  },
]

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState(SCHEDULES)

  function toggleActive(id: number) {
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s))
    )
  }

  function deleteSchedule(id: number) {
    setSchedules((prev) => prev.filter((s) => s.id !== id))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Schedules</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Recurring notifications sent on a cron schedule.
          </p>
        </div>
        <Button size="sm" className="gap-1.5">
          <PlusIcon className="size-4" />
          New schedule
        </Button>
      </div>

      {schedules.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><CalendarXIcon /></EmptyMedia>
            <EmptyTitle>No schedules yet</EmptyTitle>
            <EmptyDescription>Set up recurring notifications on a cron schedule to automate your outbound messages.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" className="gap-1.5"><PlusIcon className="size-4" />New schedule</Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {schedules.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-4 rounded-xl bg-card px-5 py-4 ring-1 ring-foreground/10"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{s.name}</p>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      s.active
                        ? "bg-green-500/10 text-green-700 dark:text-green-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s.active ? "active" : "paused"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{s.description}</p>
                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>
                    <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">{s.cron}</code>
                  </span>
                  <span>Channel: {s.channel}</span>
                  <span>Audience: {s.audience}</span>
                  <span>Next: {s.active ? s.nextRun : "—"}</span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => toggleActive(s.id)}
                  title={s.active ? "Pause" : "Resume"}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {s.active ? <PauseIcon className="size-4" /> : <PlayIcon className="size-4" />}
                </button>
                <button
                  onClick={() => deleteSchedule(s.id)}
                  title="Delete"
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2Icon className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
