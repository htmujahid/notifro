import * as React from "react"

const STYLES: Record<string, string> = {
  error: "bg-destructive/10 text-destructive",
  success: "bg-green-500/10 text-green-700 dark:text-green-400",
  warning: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  info: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
}

export function InlineAlert({
  variant = "error",
  children,
  className,
}: {
  variant?: "error" | "success" | "warning" | "info"
  children: React.ReactNode
  className?: string
}) {
  return (
    <p
      className={[
        "rounded-md px-3 py-2 text-sm",
        STYLES[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </p>
  )
}
