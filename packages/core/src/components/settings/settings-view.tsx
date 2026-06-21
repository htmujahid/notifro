import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { CopyIcon, RefreshCwIcon, TrashIcon } from "lucide-react"
import { SubscriptionsSection } from "./subscriptions-section"
import { RateLimitsSection } from "./rate-limits-section"
import { ComplianceSection } from "./compliance-section"
import { FailoverSection } from "./failover-section"
import { BrandKitSection } from "./brand-kit-section"

const API_KEYS = [
  { id: "key_01", name: "Production", prefix: "rnd_live_k8xP...m3Qa", created: "Jan 12, 2026", lastUsed: "Jun 19, 2026" },
  { id: "key_02", name: "Development", prefix: "rnd_test_aZ2Y...w9Lk", created: "Mar 4, 2026", lastUsed: "Jun 18, 2026" },
]

export function SettingsView() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your workspace, API keys, and notification limits.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-medium">Workspace</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">General workspace configuration.</p>
        </div>
        <Card size="sm">
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-8">
              <div>
                <p className="text-sm font-medium">Workspace name</p>
                <p className="text-xs text-muted-foreground">Shown in the sidebar and notification sender details.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Renderical</span>
                <Button size="sm" variant="outline">Edit</Button>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-8">
              <div>
                <p className="text-sm font-medium">Timezone</p>
                <p className="text-xs text-muted-foreground">Used for schedule evaluation and log timestamps.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">UTC+00:00</span>
                <Button size="sm" variant="outline">Change</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium">API keys</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Use these keys to authenticate requests to the Renderical API.</p>
          </div>
          <Button size="sm" className="gap-1.5">
            <RefreshCwIcon className="size-3.5" />
            New key
          </Button>
        </div>
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Key</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last used</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {API_KEYS.map((k) => (
                <tr key={k.id}>
                  <td className="px-4 py-3 font-medium">{k.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{k.prefix}</td>
                  <td className="px-4 py-3 text-muted-foreground">{k.created}</td>
                  <td className="px-4 py-3 text-muted-foreground">{k.lastUsed}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                        <CopyIcon className="size-3.5" />
                      </button>
                      <button className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
                        <TrashIcon className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <RateLimitsSection />

      <SubscriptionsSection />

      <ComplianceSection />

      <FailoverSection />

      <BrandKitSection />
    </div>
  )
}
