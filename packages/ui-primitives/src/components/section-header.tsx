import * as React from "react"

export function SectionHeader({
  title,
  description,
  children,
}: {
  title: React.ReactNode
  description?: string
  children?: React.ReactNode
}) {
  return (
    <div
      className={
        children ? "flex items-center justify-between gap-4" : ""
      }
    >
      <div>
        <h2 className="flex items-center gap-1.5 text-sm font-medium">
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex shrink-0 items-center gap-2">{children}</div>
      )}
    </div>
  )
}
