import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@workspace/app/auth/context"
import { useActiveOrganization, useOrgInvitations, organizationKeys } from "../../hooks/organization"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { TrashIcon, MailIcon } from "lucide-react"

const ROLE_LABELS: Record<string, string> = { owner: "Owner", admin: "Admin", member: "Member" }

type Invitation = { id: string; email: string; role?: string | null }

export function OrgInvitationsList() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const { data: activeOrg } = useActiveOrganization()
  const orgId = activeOrg?.id ?? ""

  const [email, setEmail] = React.useState("")
  const [role, setRole] = React.useState("member")
  const [sending, setSending] = React.useState(false)
  const [inviteError, setInviteError] = React.useState<string | null>(null)
  const [inviteSent, setInviteSent] = React.useState(false)

  const { data: invitations, isLoading } = useOrgInvitations(orgId)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setInviteError(null)
    setInviteSent(false)
    const { error } = await auth.organization.inviteMember({ email, role: role as "admin" | "member" })
    if (error) {
      setInviteError(error.message ?? null)
    } else {
      setEmail("")
      setInviteSent(true)
      await queryClient.invalidateQueries({ queryKey: organizationKeys.invitations(orgId) })
    }
    setSending(false)
  }

  async function handleCancel(invitationId: string) {
    await auth.organization.cancelInvitation({ invitationId })
    await queryClient.invalidateQueries({ queryKey: organizationKeys.invitations(orgId) })
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleInvite} className="flex flex-col gap-4 max-w-md">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invite-email">Email address</Label>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@example.com"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Role</Label>
          <Select value={role} onValueChange={(v) => { if (v) setRole(v) }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {inviteError && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{inviteError}</p>}
        {inviteSent && <p className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">Invitation sent.</p>}
        <Button type="submit" disabled={sending} className="self-start gap-1.5">
          <MailIcon className="size-3.5" />
          {sending ? "Sending…" : "Send invitation"}
        </Button>
      </form>

      {!isLoading && (invitations ?? []).length > 0 && (
        <>
          <Separator />
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Pending invitations</p>
            {(invitations ?? []).map((inv: Invitation) => (
              <Card key={inv.id} size="sm">
                <CardContent className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{inv.email}</p>
                  </div>
                  <Badge variant="outline">{ROLE_LABELS[inv.role ?? "member"] ?? inv.role}</Badge>
                  <button
                    onClick={() => handleCancel(inv.id)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    aria-label="Cancel invitation"
                  >
                    <TrashIcon className="size-3.5" />
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
