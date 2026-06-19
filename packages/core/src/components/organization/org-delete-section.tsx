import * as React from "react"
import { useNavigate } from "react-router"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@workspace/app/auth/context"
import { useActiveOrganization, useActiveMember, organizationKeys } from "../../hooks/organization"
import { Button } from "@workspace/ui/components/button"

export function OrgDeleteSection() {
  const auth = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: activeOrg } = useActiveOrganization()
  const { data: activeMember } = useActiveMember(activeOrg?.id ?? "")

  const [confirming, setConfirming] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  if (activeMember?.role !== "owner") return null

  async function handleDelete() {
    if (!activeOrg?.id) return
    setDeleting(true)
    setError(null)
    const { error: err } = await auth.organization.delete({ organizationId: activeOrg.id })
    if (err) {
      setError(err.message ?? null)
      setDeleting(false)
      setConfirming(false)
      return
    }
    await queryClient.invalidateQueries({ queryKey: organizationKeys.list })
    await queryClient.invalidateQueries({ queryKey: organizationKeys.active })
    navigate("/")
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {confirming ? (
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            This will permanently delete <strong>{activeOrg?.name}</strong> and all its data.
          </p>
          <Button
            variant="destructive"
            size="sm"
            disabled={deleting}
            onClick={handleDelete}
          >
            {deleting ? "Deleting…" : "Yes, delete"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          variant="destructive"
          size="sm"
          className="self-start"
          onClick={() => setConfirming(true)}
        >
          Delete organization
        </Button>
      )}
    </div>
  )
}
