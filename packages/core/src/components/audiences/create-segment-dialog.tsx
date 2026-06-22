import React from "react"

import { Button } from "@renderical/ui/components/button"
import { Input } from "@renderical/ui/components/input"
import { Label } from "@renderical/ui/components/label"

import { useCreateSegment } from "../../queries/segments"
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "../responsive-modal"

export function CreateSegmentDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [name, setName] = React.useState("")
  const [filter, setFilter] = React.useState("{}")
  const [error, setError] = React.useState<string | null>(null)
  const create = useCreateSegment()

  function handleSubmit() {
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(filter) as Record<string, unknown>
    } catch {
      setError("Filter must be valid JSON.")
      return
    }
    setError(null)

    create.mutate(
      { name: name.trim(), filter: parsed },
      {
        onSuccess: () => {
          setName("")
          setFilter("{}")
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className="max-w-md">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>New segment</ResponsiveModalTitle>
        </ResponsiveModalHeader>
        <ResponsiveModalBody className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label>Name</Label>
            <Input
              placeholder="Active users"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Filter (JSON)</Label>
            <textarea
              className="min-h-32 rounded-md border bg-background px-3 py-2 font-mono text-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              An empty object <code>{"{}"}</code> matches all recipients.
            </p>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        </ResponsiveModalBody>
        <ResponsiveModalFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={create.isPending || !name.trim()}
          >
            {create.isPending ? "Creating…" : "Create segment"}
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
