import { Separator } from "@workspace/ui/components/separator"
import { OrgGeneralSettings } from "@workspace/core/components/organization/org-general-settings"
import { OrgLeaveSection } from "@workspace/core/components/organization/org-leave-section"
import { OrgDeleteSection } from "@workspace/core/components/organization/org-delete-section"

export default function OrgGeneralPage() {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-6">
        <div>
          <h2 className="text-base font-semibold tracking-tight">General</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Update your organization's name and details.
          </p>
        </div>
        <OrgGeneralSettings />
      </section>

      <Separator />

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-medium text-destructive">Danger zone</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Irreversible actions for this organization.
          </p>
        </div>
        <OrgLeaveSection />
        <OrgDeleteSection />
      </section>
    </div>
  )
}
