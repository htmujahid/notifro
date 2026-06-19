import { OrgMembersList } from "@workspace/core/components/organization/org-members-list"

export default function OrgMembersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Members</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage who has access to this organization.
        </p>
      </div>
      <OrgMembersList />
    </div>
  )
}
