import * as React from "react"
import { useNavigate } from "react-router"
import { useAuth } from "@workspace/app/auth/context"
import { useInvitation } from "../../hooks/organization"
import { Button } from "@workspace/ui/components/button"

export function AcceptInvitationCard({ invitationId }: { invitationId: string | undefined }) {
  const auth = useAuth()
  const navigate = useNavigate()
  const [acting, setActing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const { data: invitation, isLoading } = useInvitation(invitationId)

  async function handleAccept() {
    if (!invitationId) return
    setActing(true)
    setError(null)
    const { error: err } = await auth.organization.acceptInvitation({ invitationId })
    if (err) {
      setError(err.message ?? null)
      setActing(false)
      return
    }
    navigate("/")
  }

  async function handleDecline() {
    if (!invitationId) return
    setActing(true)
    setError(null)
    const { error: err } = await auth.organization.rejectInvitation({ invitationId })
    if (err) {
      setError(err.message ?? null)
      setActing(false)
      return
    }
    navigate("/")
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading invitation…</p>
  }

  if (!invitation) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <h2 className="text-lg font-semibold">Invitation not found</h2>
        <p className="text-sm text-muted-foreground">
          This invitation may have expired or already been used.
        </p>
        <Button variant="outline" onClick={() => navigate("/")}>Go home</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">You've been invited</h2>
        <p className="text-sm text-muted-foreground">
          <strong>{invitation.inviterEmail ?? "Someone"}</strong> has invited you to join{" "}
          <strong>{invitation.organizationName ?? "an organization"}</strong> as{" "}
          <strong>{invitation.role ?? "member"}</strong>.
        </p>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-3">
        <Button onClick={handleAccept} disabled={acting}>
          {acting ? "Accepting…" : "Accept invitation"}
        </Button>
        <Button variant="outline" onClick={handleDecline} disabled={acting}>
          Decline
        </Button>
      </div>
    </div>
  )
}
