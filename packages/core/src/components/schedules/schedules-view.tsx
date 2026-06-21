import { useState } from "react"

import {
  CalendarXIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react"

import { Button } from "@renderical/ui/components/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@renderical/ui/components/empty"

import {
  useCancelSchedule,
  useDeleteRecurringSend,
  usePatchRecurringSend,
  useRecurringSends,
  useSchedules,
} from "../../hooks/schedules"
import { RecurringRow } from "./recurring-row"

export function SchedulesView() {
  const [tab, setTab] = useState<"scheduled" | "recurring">("scheduled")
  const { data: scheduledData, isLoading: scheduledLoading } = useSchedules({
    status: "pending",
  })
  const cancelSchedule = useCancelSchedule()
  const { data: recurringData, isLoading: recurringLoading } =
    useRecurringSends()
  const deleteRecurring = useDeleteRecurringSend()
  const patchRecurring = usePatchRecurringSend()

  const schedules = scheduledData?.pages.flatMap((p) => p.data) ?? []
  const recurrings = recurringData?.pages.flatMap((p) => p.data) ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Schedules</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One-off and recurring notification schedules.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" disabled>
          <PlusIcon className="size-4" />
          New schedule
        </Button>
      </div>

      <div className="flex gap-1 border-b">
        {(["scheduled", "recurring"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? "border-b-2 border-foreground text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "scheduled" ? "Scheduled" : "Recurring"}
          </button>
        ))}
      </div>

      {tab === "scheduled" &&
        (scheduledLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : schedules.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarXIcon />
              </EmptyMedia>
              <EmptyTitle>No scheduled messages</EmptyTitle>
              <EmptyDescription>
                Schedule a notification by passing <code>sendAt</code> or{" "}
                <code>sendAtLocal</code> in the compose payload.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button size="sm" className="gap-1.5" disabled>
                <PlusIcon className="size-4" />
                New schedule
              </Button>
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
                    <p className="font-mono text-xs text-muted-foreground">
                      {s.id}
                    </p>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        s.status === "pending"
                          ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                          : s.status === "enqueued"
                            ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Send at: {new Date(s.sendAt).toLocaleString()}</span>
                    {s.timezone && <span>TZ: {s.timezone}</span>}
                    {s.quietHoursStart && s.quietHoursEnd && (
                      <span>
                        Quiet: {s.quietHoursStart}–{s.quietHoursEnd}
                      </span>
                    )}
                  </div>
                </div>
                {s.status === "pending" && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => cancelSchedule.mutate(s.id)}
                      disabled={cancelSchedule.isPending}
                      title="Cancel"
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2Icon className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

      {tab === "recurring" &&
        (recurringLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : recurrings.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <RefreshCwIcon />
              </EmptyMedia>
              <EmptyTitle>No recurring sends</EmptyTitle>
              <EmptyDescription>
                Create a recurring send via <code>POST /api/recurring</code>{" "}
                with a cron expression and payload.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button size="sm" className="gap-1.5" disabled>
                <PlusIcon className="size-4" />
                New recurring
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="flex flex-col gap-3">
            {recurrings.map((r) => (
              <RecurringRow
                key={r.id}
                r={r}
                onDelete={() => deleteRecurring.mutate(r.id)}
                onToggle={() =>
                  patchRecurring.mutate({
                    id: r.id,
                    enabled: r.enabled ? 0 : 1,
                  })
                }
              />
            ))}
          </div>
        ))}
    </div>
  )
}
