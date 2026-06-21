import { Link } from "react-router"

import { Button } from "@renderical/ui/components/button"
import { Card, CardContent } from "@renderical/ui/components/card"
import { Separator } from "@renderical/ui/components/separator"

import { BrandKitSection } from "./brand-kit-section"
import { ComplianceSection } from "./compliance-section"
import { FailoverSection } from "./failover-section"
import { RateLimitsSection } from "./rate-limits-section"
import { SubscriptionsSection } from "./subscriptions-section"

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
          <p className="mt-0.5 text-xs text-muted-foreground">
            General workspace configuration.
          </p>
        </div>
        <Card size="sm">
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-8">
              <div>
                <p className="text-sm font-medium">Workspace name</p>
                <p className="text-xs text-muted-foreground">
                  Shown in the sidebar and notification sender details.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Renderical</span>
                <Button size="sm" variant="outline">
                  Edit
                </Button>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-8">
              <div>
                <p className="text-sm font-medium">Timezone</p>
                <p className="text-xs text-muted-foreground">
                  Used for schedule evaluation and log timestamps.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">UTC+00:00</span>
                <Button size="sm" variant="outline">
                  Change
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-8">
          <div>
            <h2 className="text-sm font-medium">API keys</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Create and manage keys to authenticate requests to the Renderical
              API.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            render={<Link to="/developers" />}
          >
            Manage keys
          </Button>
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
