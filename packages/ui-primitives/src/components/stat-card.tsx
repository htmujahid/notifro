import * as React from "react"

const GRID_COLS: Record<number, string> = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  8: "grid-cols-2 sm:grid-cols-4 lg:grid-cols-8",
}

export function StatCard({
  label,
  value,
  description,
  icon: Icon,
  size = "lg",
}: {
  label: string
  value: string | number
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  size?: "sm" | "lg"
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        {Icon && <Icon className="size-4 text-muted-foreground" />}
      </div>
      <p
        className={`mt-1.5 font-bold text-foreground ${
          size === "lg" ? "text-2xl" : "text-lg"
        }`}
      >
        {value}
      </p>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

export function StatCardGrid({
  children,
  cols = 4,
}: {
  children: React.ReactNode
  cols?: 2 | 3 | 4 | 8
}) {
  return (
    <div className={`grid gap-4 ${GRID_COLS[cols]}`}>{children}</div>
  )
}
