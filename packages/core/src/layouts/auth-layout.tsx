import { Suspense } from "react"
import { Outlet } from "react-router"

function RendericalLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function AuthLayout() {
  return (
    <div className="flex h-svh overflow-hidden bg-background">
      {/* Left panel — visible lg+ */}
      <aside className="hidden lg:flex w-[44%] xl:w-[46%] shrink-0 flex-col border-r border-border bg-muted/40">
        <div className="flex flex-col h-full px-10 xl:px-14 py-10">
          {/* Brand */}
          <div className="flex items-center gap-2 text-foreground">
            <RendericalLogo />
            <span className="font-semibold tracking-tight text-sm">Renderical</span>
          </div>

          {/* Main copy */}
          <div className="mt-auto mb-auto flex flex-col gap-8">
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Notification infrastructure
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Schedule once,<br />notify anywhere.
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                One workspace to schedule, deliver, and manage notifications across every channel your users live in.
              </p>
            </div>

            {/* Feature list */}
            <ul className="space-y-3 text-sm text-muted-foreground">
              {[
                "Schedule one-time and recurring notifications",
                "Snooze, reschedule, and cancel on the fly",
                "Deliver to in-app, email, Slack, and more",
                "Powered by Cloudflare Workers",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <svg className="mt-0.5 size-4 shrink-0 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Placeholder quote */}
          <blockquote className="border-t border-border pt-8 space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed italic">
              "We replaced three cron jobs and a tangle of integrations with one scheduling layer. Reminders, digests, and alerts now ship from the same place."
            </p>
            <footer className="flex items-center gap-3">
              <div className="size-8 rounded-full bg-muted border border-border" />
              <div>
                <p className="text-xs font-medium text-foreground">Placeholder Name</p>
                <p className="text-xs text-muted-foreground">Role, Company</p>
              </div>
            </footer>
          </blockquote>
        </div>
      </aside>

      {/* Right panel — scrollable form */}
      <main className="flex flex-1 flex-col overflow-y-auto">
        {/* Mobile brand bar */}
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-6 py-4 lg:hidden">
          <RendericalLogo />
          <span className="text-sm font-semibold tracking-tight">Renderical</span>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-sm">
            <Suspense fallback={null}>
              <Outlet />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  )
}
