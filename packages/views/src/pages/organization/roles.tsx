import { OrgRolesOverview } from "@workspace/core/components/organization/org-roles-overview"

export default function OrgRolesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Roles</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Default roles and their permissions in this organization.
        </p>
      </div>
      <OrgRolesOverview />
    </div>
  )
}
