import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { useCreateSegment } from "../../hooks/audiences"
import { FilterBuilder } from "./filter-builder"
import type { FilterClause } from "./filter-builder"

export function NewSegmentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("")
  const [clauses, setClauses] = useState<FilterClause[]>([{ field: "", op: "eq", value: "" }])
  const createSegment = useCreateSegment()

  async function handleCreate() {
    if (!name.trim() || clauses.length === 0) return
    const validClauses = clauses.filter((c) => c.field.trim() && c.value.trim())
    if (validClauses.length === 0) return
    const filter = validClauses.length === 1
      ? validClauses[0]
      : { and: validClauses }
    await createSegment.mutateAsync({ name: name.trim(), filter: filter as Record<string, unknown> })
    setName("")
    setClauses([{ field: "", op: "eq", value: "" }])
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New audience segment</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label>Name</Label>
            <Input placeholder="e.g. Premium users" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Filter conditions (AND)</Label>
            <FilterBuilder clauses={clauses} onChange={setClauses} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={createSegment.isPending || !name.trim()}>
            {createSegment.isPending ? "Creating…" : "Create segment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
