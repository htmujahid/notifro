import * as React from "react"
import { toast } from "sonner"
import { Button } from "@workspace/ui/components/button"
import { Textarea } from "@workspace/ui/components/textarea"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/components/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  useJourneys,
  useCreateJourney,
  useDeleteJourney,
} from "../../hooks/journeys"
import type { Journey } from "@workspace/api-client/types"
import { JourneyStatusBadge } from "./journey-status-badge"
import { JourneyDetailDialog } from "./journey-detail-dialog"

const EXAMPLE_STEPS = JSON.stringify(
  {
    step1: { kind: "send", config: { payload: { content: { title: "Welcome!", body: "Thanks for joining." } }, channels: ["email"] }, next: "step2" },
    step2: { kind: "wait", config: { delayMs: 60000 }, next: "step3" },
    step3: { kind: "send", config: { payload: { content: { title: "Follow up", body: "Just checking in." } }, channels: ["email"] }, next: "step4" },
    step4: { kind: "exit", config: {} },
  },
  null,
  2,
)

const EXAMPLE_TRIGGER = JSON.stringify({ type: "event", event: "user.signed_up" }, null, 2)

function stepCount(stepsJson: string): number {
  try { return Object.keys(JSON.parse(stepsJson)).length } catch { return 0 }
}

function triggerLabel(trigger: string | null): string {
  if (!trigger) return "manual"
  try {
    const t = JSON.parse(trigger) as { type: string; event?: string; segmentId?: string }
    if (t.type === "event") return `event: ${t.event ?? "?"}`
    if (t.type === "segment") return `segment: ${t.segmentId ?? "?"}`
    return t.type
  } catch { return "unknown" }
}

export function JourneysView() {
  const { data, isLoading } = useJourneys()
  const createJourney = useCreateJourney()
  const deleteJourney = useDeleteJourney()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<Journey | null>(null)
  const [newName, setNewName] = React.useState("")
  const [newSteps, setNewSteps] = React.useState(EXAMPLE_STEPS)
  const [newTrigger, setNewTrigger] = React.useState(EXAMPLE_TRIGGER)

  const journeys = data?.pages.flatMap((p) => (p as { data: Journey[] }).data) ?? []

  async function handleCreate() {
    if (!newName.trim()) return
    let stepsObj: Record<string, unknown>
    try {
      stepsObj = JSON.parse(newSteps)
    } catch {
      toast.error("Steps JSON is invalid")
      return
    }
    let triggerObj: Record<string, unknown> | undefined
    if (newTrigger.trim()) {
      try {
        triggerObj = JSON.parse(newTrigger)
      } catch {
        toast.error("Trigger JSON is invalid")
        return
      }
    }
    await createJourney.mutateAsync({ name: newName.trim(), steps: stepsObj, trigger: triggerObj })
    toast.success("Journey created")
    setCreateOpen(false)
    setNewName("")
    setNewSteps(EXAMPLE_STEPS)
    setNewTrigger(EXAMPLE_TRIGGER)
  }

  async function handleDelete(id: string) {
    try {
      await deleteJourney.mutateAsync(id)
      toast.success("Journey deleted")
    } catch {
      toast.error("Cannot delete an active journey")
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Journeys</h1>
        <Button onClick={() => setCreateOpen(true)}>New Journey</Button>
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Trigger</TableHead>
            <TableHead>Steps</TableHead>
            <TableHead>Created</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {journeys.length === 0 && !isLoading && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No journeys yet. Create one to get started.
              </TableCell>
            </TableRow>
          )}
          {journeys.map((journey) => (
            <TableRow key={journey.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(journey)}>
              <TableCell className="font-medium">{journey.name}</TableCell>
              <TableCell><JourneyStatusBadge status={journey.status} /></TableCell>
              <TableCell className="text-sm text-muted-foreground">{triggerLabel(journey.trigger)}</TableCell>
              <TableCell>{stepCount(journey.steps)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{new Date(journey.createdAt).toLocaleDateString()}</TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(journey.id)}
                  disabled={deleteJourney.isPending}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {selected && (
        <JourneyDetailDialog
          journey={selected}
          onClose={() => setSelected(null)}
        />
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Journey</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input placeholder="Welcome sequence" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Trigger (JSON, optional)</Label>
              <Textarea
                className="font-mono text-xs"
                rows={3}
                value={newTrigger}
                onChange={(e) => setNewTrigger(e.target.value)}
                placeholder={EXAMPLE_TRIGGER}
              />
            </div>
            <div className="space-y-1">
              <Label>Steps (JSON)</Label>
              <Textarea
                className="font-mono text-xs"
                rows={10}
                value={newSteps}
                onChange={(e) => setNewSteps(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createJourney.isPending || !newName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
