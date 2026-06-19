import { OrgInvitationsList } from "@workspace/core/components/organization/org-invitations-list"

export default function OrgInvitationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Invitations</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Invite people to join your organization.
        </p>
      </div>
      <OrgInvitationsList />
    </div>
  )
}
