import { cn } from "@renderical/ui/lib/utils"

/**
 * The Renderical brand mark — the stacked-layers glyph, drawn with `currentColor`
 * so it inherits the surrounding text color (foreground when inline, or
 * primary-foreground inside a primary tile). This is the canonical logo used
 * everywhere: app shell, favicons, app icons, and OG images.
 *
 * Override the size with `className` (e.g. `size-4`).
 */
export function RendericalMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label="Renderical"
      className={cn("size-5", className)}
    >
      <path
        d="M12 2L2 7l10 5 10-5-10-5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 17l10 5 10-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 12l10 5 10-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Mark + "Renderical" wordmark lockup. */
export function RendericalWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 font-semibold tracking-tight text-foreground",
        className
      )}
    >
      <RendericalMark className="size-[18px]" />
      <span className="text-sm">Renderical</span>
    </span>
  )
}
