import { RendericalMark } from "@renderical/core/components/renderical-logo"
import { buttonVariants } from "@renderical/ui/components/button"
import { Link } from "react-router"

export default function NotFoundPage() {
  return (
    <div className="relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background p-6 text-center">
      {/* dotted backdrop with a radial fade */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(color-mix(in oklch, var(--foreground) 12%, transparent) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
          maskImage:
            "radial-gradient(ellipse 60% 50% at 50% 32%, #000 40%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 60% 50% at 50% 32%, #000 40%, transparent 75%)",
        }}
      />
      {/* primary glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/3 -z-10 size-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-[110px]"
      />

      {/* brand */}
      <div className="mb-8 flex items-center gap-2 text-foreground">
        <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <RendericalMark className="size-4" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Renderical</span>
      </div>

      {/* animated status badge */}
      <span className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
        <span className="relative flex size-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
          <span className="relative inline-flex size-2 rounded-full bg-primary" />
        </span>
        Status 404 · Undeliverable
      </span>

      {/* mega gradient number */}
      <h1 className="mt-6 select-none bg-gradient-to-br from-primary via-sky-500 to-indigo-500 bg-clip-text text-[5.5rem] font-bold leading-[0.82] tracking-tighter text-transparent sm:text-[8rem]">
        404
      </h1>

      <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
        This page didn't deliver
      </h2>
      <p className="mt-2 max-w-sm text-pretty text-muted-foreground">
        We couldn't route you there — that page doesn't exist or has moved.
        Let's get you back to your notifications.
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link to="/" className={buttonVariants({ size: "lg" })}>
          Back to dashboard
        </Link>
        <Link
          to="/channels"
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          View channels
        </Link>
      </div>
    </div>
  )
}
