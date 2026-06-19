import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@workspace/app/auth/context"
import { useActiveOrganization, useActiveMember, organizationKeys } from "../../hooks/organization"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

export function OrgGeneralSettings() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const { data: org } = useActiveOrganization()
  const { data: activeMember } = useActiveMember(org?.id ?? "")

  const [name, setName] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const isOwner = activeMember?.role === "owner"

  React.useEffect(() => {
    if (org?.name) setName(org.name)
  }, [org])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    const { error: err } = await auth.organization.update({ data: { name } })
    if (err) {
      setError(err.message ?? null)
    } else {
      await queryClient.invalidateQueries({ queryKey: organizationKeys.active })
      await queryClient.invalidateQueries({ queryKey: organizationKeys.list })
      setSaved(true)
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4 max-w-md">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="org-name">Organization name</Label>
        <Input
          id="org-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!isOwner}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Slug</Label>
        <Input value={org?.slug ?? ""} disabled className="text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Slug cannot be changed after creation.</p>
      </div>
      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {saved && <p className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">Saved.</p>}
      {isOwner && (
        <Button type="submit" disabled={saving} className="self-start">
          {saving ? "Saving…" : "Save changes"}
        </Button>
      )}
    </form>
  )
}
