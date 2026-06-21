import type { RecurringSend } from "@workspace/api-client/types"
import { ToggleLeftIcon, ToggleRightIcon, Trash2Icon } from "lucide-react"

function formatCron(cron: string): string {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return cron
  const [min, hour, , , dow] = parts
  if (min === "*" && hour === "*") return "Every minute"
  if (min.startsWith("*/")) return `Every ${min.slice(2)} minutes`
  if (hour === "*") return `At minute ${min} of every hour`
  const h = parseInt(hour, 10)
  const m = parseInt(min, 10)
  const time = `${String(h).padStart(2, "0")}:${String(isNaN(m) ? 0 : m).padStart(2, "0")}`
  const dayMap: Record<string, string> = {
    "0": "Sun",
    "1": "Mon",
    "2": "Tue",
    "3": "Wed",
    "4": "Thu",
    "5": "Fri",
    "6": "Sat",
  }
  if (dow === "*") return `Daily at ${time}`
  if (dow === "1-5") return `Weekdays at ${time}`
  if (dow === "0,6" || dow === "6,0") return `Weekends at ${time}`
  const day = dayMap[dow]
  return day ? `Every ${day} at ${time}` : `${cron}`
}

export function RecurringRow({
  r,
  onDelete,
  onToggle,
}: {
  r: RecurringSend
  onDelete: () => void
  onToggle: () => void
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl bg-card px-5 py-4 ring-1 ring-foreground/10">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{formatCron(r.cron)}</p>
          <span className="font-mono text-xs text-muted-foreground">
            {r.cron}
          </span>
          <span
            className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              r.enabled
                ? "bg-green-500/10 text-green-700 dark:text-green-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {r.enabled ? "enabled" : "disabled"}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
          <span>TZ: {r.timezone}</span>
          <span>Next: {new Date(r.nextRunAt).toLocaleString()}</span>
          {r.lastRunAt && (
            <span>Last: {new Date(r.lastRunAt).toLocaleString()}</span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={onToggle}
          title={r.enabled ? "Disable" : "Enable"}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted"
        >
          {r.enabled ? (
            <ToggleRightIcon className="size-4 text-green-600" />
          ) : (
            <ToggleLeftIcon className="size-4" />
          )}
        </button>
        <button
          onClick={onDelete}
          title="Delete"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2Icon className="size-4" />
        </button>
      </div>
    </div>
  )
}
