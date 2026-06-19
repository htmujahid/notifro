import { useActiveOrganization, useActiveMember } from "../../hooks/organization"
import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent } from "@workspace/ui/components/card"
import { CheckIcon, MinusIcon } from "lucide-react"

type Role = "owner" | "admin" | "member"

type PermissionRow = {
  resource: string
  action: string
  owner: boolean
  admin: boolean
  member: boolean
}

const PERMISSION_ROWS: PermissionRow[] = [
  { resource: "Organization", action: "Update name", owner: true,  admin: true,  member: false },
  { resource: "Organization", action: "Delete",      owner: true,  admin: false, member: false },
  { resource: "Members",      action: "Invite",      owner: true,  admin: true,  member: false },
  { resource: "Members",      action: "Change role", owner: true,  admin: true,  member: false },
  { resource: "Members",      action: "Remove",      owner: true,  admin: true,  member: false },
  { resource: "Invitations",  action: "Create",      owner: true,  admin: true,  member: false },
  { resource: "Invitations",  action: "Cancel",      owner: true,  admin: true,  member: false },
]

const ROLES: { key: Role; label: string; description: string }[] = [
  { key: "owner",  label: "Owner",  description: "Full control over the organization and all resources." },
  { key: "admin",  label: "Admin",  description: "Manage members and invitations. Cannot delete the organization." },
  { key: "member", label: "Member", description: "Read-only access. Cannot manage members or invitations." },
]

function roleBadgeVariant(role: Role): "default" | "secondary" | "outline" {
  if (role === "owner") return "default"
  if (role === "admin") return "secondary"
  return "outline"
}

function PermIcon({ allowed }: { allowed: boolean }) {
  if (allowed) return <CheckIcon className="size-3.5 text-primary" />
  return <MinusIcon className="size-3.5 text-muted-foreground/40" />
}

export function OrgRolesOverview() {
  const { data: activeOrg } = useActiveOrganization()
  const orgId = activeOrg?.id ?? ""
  const { data: activeMember } = useActiveMember(orgId)
  const myRole = activeMember?.role as Role | undefined

  return (
    <div className="flex flex-col gap-6">
      {ROLES.map(({ key, label, description }) => (
        <Card key={key} size="sm">
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Badge variant={roleBadgeVariant(key)}>{label}</Badge>
              {myRole === key && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  Your role
                </span>
              )}
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>

            <div className="overflow-hidden rounded-lg ring-1 ring-foreground/10">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Resource</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Action</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">Allowed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {PERMISSION_ROWS.map((row) => (
                    <tr key={`${row.resource}-${row.action}`}>
                      <td className="px-3 py-2 text-muted-foreground">{row.resource}</td>
                      <td className="px-3 py-2">{row.action}</td>
                      <td className="px-3 py-2 text-center">
                        <span className="flex justify-center">
                          <PermIcon allowed={row[key]} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
