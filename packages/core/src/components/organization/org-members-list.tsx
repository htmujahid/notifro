import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@workspace/app/auth/context"
import { useSession } from "@workspace/app/auth/use-session"
import { useActiveOrganization, useActiveMember, useOrgMembers, organizationKeys } from "../../hooks/organization"
import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent } from "@workspace/ui/components/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { TrashIcon } from "lucide-react"

const ROLE_LABELS: Record<string, string> = { owner: "Owner", admin: "Admin", member: "Member" }

function roleBadgeVariant(role: string): "default" | "secondary" | "outline" {
  if (role === "owner") return "default"
  if (role === "admin") return "secondary"
  return "outline"
}

type Member = {
  id: string
  userId: string
  role: string
  user?: { name?: string | null; email?: string | null }
}

export function OrgMembersList() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const { data: activeOrg } = useActiveOrganization()
  const orgId = activeOrg?.id ?? ""
  const { data: activeMember } = useActiveMember(orgId)
  const { data: members, isLoading } = useOrgMembers(orgId)

  const canManage = activeMember?.role === "owner" || activeMember?.role === "admin"

  async function handleRemove(memberId: string) {
    await auth.organization.removeMember({ memberIdOrEmail: memberId })
    await queryClient.invalidateQueries({ queryKey: organizationKeys.members(orgId) })
  }

  async function handleRoleChange(memberId: string, role: string) {
    await auth.organization.updateMemberRole({ memberId, role: role as "owner" | "admin" | "member" })
    await queryClient.invalidateQueries({ queryKey: organizationKeys.members(orgId) })
    await queryClient.invalidateQueries({ queryKey: organizationKeys.activeMember(orgId) })
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>

  return (
    <div className="flex flex-col gap-3">
      {(members ?? []).map((m: Member) => {
        const isSelf = m.userId === session?.user?.id
        return (
          <Card key={m.id} size="sm">
            <CardContent className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-muted text-sm font-semibold shrink-0">
                {(m.user?.name ?? m.user?.email ?? "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.user?.name || m.user?.email}</p>
                {m.user?.name && <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>}
              </div>
              <Badge variant={roleBadgeVariant(m.role)}>{ROLE_LABELS[m.role] ?? m.role}</Badge>
              {canManage && !isSelf && m.role !== "owner" && (
                <Select value={m.role} onValueChange={(v) => { if (v) handleRoleChange(m.id, v) }}>
                  <SelectTrigger className="w-28 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {activeMember?.role === "owner" && (
                      <SelectItem value="owner">Owner</SelectItem>
                    )}
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {canManage && !isSelf && m.role !== "owner" && (
                <button
                  onClick={() => handleRemove(m.id)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  aria-label="Remove member"
                >
                  <TrashIcon className="size-3.5" />
                </button>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
