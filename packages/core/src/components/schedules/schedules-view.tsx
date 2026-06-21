import { CalendarXIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@workspace/ui/components/empty"
import { useSchedules, useCancelSchedule } from "@workspace/core/hooks/schedules"

export function SchedulesView() {
  const { data, isLoading } = useSchedules({ status: "pending" })
  const cancel = useCancelSchedule()

  const schedules = data?.pages.flatMap((p) => p.data) ?? []

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Schedules</h1>
          <p className="mt-1 text-sm text-muted-foreground">Future notifications awaiting delivery.</p>
        </div>
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Schedules</h1>
          <p className="mt-1 text-sm text-muted-foreground">Future notifications awaiting delivery.</p>
        </div>
        <Button size="sm" className="gap-1.5" disabled>
          <PlusIcon className="size-4" />
          New schedule
        </Button>
      </div>

      {schedules.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><CalendarXIcon /></EmptyMedia>
            <EmptyTitle>No scheduled messages</EmptyTitle>
            <EmptyDescription>
              Schedule a notification by passing <code>sendAt</code> or <code>sendAtLocal</code> in the compose payload.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" className="gap-1.5" disabled><PlusIcon className="size-4" />New schedule</Button>
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
                  <p className="font-mono text-xs text-muted-foreground">{s.id}</p>
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
                    <span>Quiet: {s.quietHoursStart}–{s.quietHoursEnd}</span>
                  )}
                </div>
              </div>

              {s.status === "pending" && (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => cancel.mutate(s.id)}
                    disabled={cancel.isPending}
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
      )}
    </div>
  )
}
