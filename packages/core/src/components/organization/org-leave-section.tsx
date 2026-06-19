import * as React from "react"
import { useNavigate } from "react-router"
import { useAuth } from "@workspace/app/auth/context"
import { useActiveOrganization, useActiveMember } from "../../hooks/organization"
import { Button } from "@workspace/ui/components/button"

export function OrgLeaveSection() {
  const auth = useAuth()
  const navigate = useNavigate()
  const { data: activeOrg } = useActiveOrganization()
  const { data: activeMember } = useActiveMember(activeOrg?.id ?? "")

  const [confirming, setConfirming] = React.useState(false)
  const [leaving, setLeaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const isOwner = activeMember?.role === "owner"

  if (!activeMember) return null

  if (isOwner) {
    return (
      <p className="text-sm text-muted-foreground">
        You are the owner of this organization. Transfer ownership before leaving.
      </p>
    )
  }

  async function handleLeave() {
    if (!activeOrg?.id) return
    setLeaving(true)
    setError(null)
    const { error: err } = await auth.organization.leave({ organizationId: activeOrg.id })
    if (err) {
      setError(err.message ?? null)
      setLeaving(false)
      setConfirming(false)
      return
    }
    navigate("/")
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {confirming ? (
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">Are you sure you want to leave this organization?</p>
          <Button
            variant="destructive"
            size="sm"
            disabled={leaving}
            onClick={handleLeave}
          >
            {leaving ? "Leaving…" : "Yes, leave"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="self-start border-destructive/50 text-destructive hover:bg-destructive/10 hover:border-destructive"
          onClick={() => setConfirming(true)}
        >
          Leave organization
        </Button>
      )}
    </div>
  )
}
