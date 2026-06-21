import * as React from "react"
import { toast } from "sonner"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import {
  useJourneys,
  useCreateJourney,
  useUpdateJourney,
  useDeleteJourney,
  useActivateJourney,
  useJourneyRuns,
  useEnrollRecipient,
} from "@workspace/core/hooks/journeys"
import type { Journey, JourneyRun } from "@workspace/api-client/types"

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

function statusBadge(status: string) {
  const map: Record<string, string> = { draft: "secondary", active: "default", paused: "outline", completed: "secondary" }
  return <Badge variant={(map[status] ?? "secondary") as "default" | "secondary" | "outline"}>{status}</Badge>
}

function JourneyDetailDialog({
  journey,
  onClose,
}: {
  journey: Journey
  onClose: () => void
}) {
  const runsQuery = useJourneyRuns(journey.id)
  const activate = useActivateJourney()
  const update = useUpdateJourney()
  const enroll = useEnrollRecipient()
  const [enrollId, setEnrollId] = React.useState("")
  const [editSteps, setEditSteps] = React.useState(false)
  const [stepsValue, setStepsValue] = React.useState(journey.steps)
  const [triggerValue, setTriggerValue] = React.useState(journey.trigger ?? "")

  const runs = runsQuery.data?.pages.flatMap((p) => (p as { data: JourneyRun[] }).data) ?? []

  async function handleActivate() {
    await activate.mutateAsync(journey.id)
    toast.success("Journey activated")
  }

  async function handlePause() {
    await update.mutateAsync({ id: journey.id, status: "paused" })
    toast.success("Journey paused")
  }

  async function handleSaveEdit() {
    try {
      JSON.parse(stepsValue)
    } catch {
      toast.error("Steps JSON is invalid")
      return
    }
    let parsedTrigger: Record<string, unknown> | null = null
    if (triggerValue.trim()) {
      try {
        parsedTrigger = JSON.parse(triggerValue)
      } catch {
        toast.error("Trigger JSON is invalid")
        return
      }
    }
    await update.mutateAsync({ id: journey.id, steps: JSON.parse(stepsValue), trigger: parsedTrigger })
    setEditSteps(false)
    toast.success("Journey saved")
  }

  async function handleEnroll() {
    if (!enrollId.trim()) return
    try {
      await enroll.mutateAsync({ journeyId: journey.id, recipientId: enrollId.trim() })
      toast.success("Recipient enrolled")
      setEnrollId("")
    } catch {
      toast.error("Enrollment failed")
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {journey.name} {statusBadge(journey.status)}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="definition">
          <TabsList>
            <TabsTrigger value="definition">Definition</TabsTrigger>
            <TabsTrigger value="runs">Runs ({runs.length})</TabsTrigger>
            <TabsTrigger value="enroll">Enroll</TabsTrigger>
          </TabsList>

          <TabsContent value="definition" className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Trigger</Label>
              {editSteps ? (
                <Textarea
                  className="font-mono text-xs"
                  rows={4}
                  value={triggerValue}
                  onChange={(e) => setTriggerValue(e.target.value)}
                  placeholder={EXAMPLE_TRIGGER}
                />
              ) : (
                <pre className="rounded bg-muted p-2 text-xs overflow-auto max-h-24">
                  {journey.trigger ?? "(none)"}
                </pre>
              )}
            </div>
            <div className="space-y-2">
              <Label>Steps (JSON)</Label>
              {editSteps ? (
                <Textarea
                  className="font-mono text-xs"
                  rows={12}
                  value={stepsValue}
                  onChange={(e) => setStepsValue(e.target.value)}
                />
              ) : (
                <pre className="rounded bg-muted p-2 text-xs overflow-auto max-h-48">
                  {(() => { try { return JSON.stringify(JSON.parse(journey.steps), null, 2) } catch { return journey.steps } })()}
                </pre>
              )}
            </div>
            <div className="flex gap-2">
              {!editSteps ? (
                <Button size="sm" variant="outline" onClick={() => setEditSteps(true)} disabled={journey.status === "active"}>
                  Edit
                </Button>
              ) : (
                <>
                  <Button size="sm" onClick={handleSaveEdit} disabled={update.isPending}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditSteps(false); setStepsValue(journey.steps); setTriggerValue(journey.trigger ?? "") }}>
                    Cancel
                  </Button>
                </>
              )}
              {journey.status === "draft" || journey.status === "paused" ? (
                <Button size="sm" onClick={handleActivate} disabled={activate.isPending}>Activate</Button>
              ) : journey.status === "active" ? (
                <Button size="sm" variant="outline" onClick={handlePause} disabled={update.isPending}>Pause</Button>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="runs" className="pt-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Run ID</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Step</TableHead>
                  <TableHead>Resume At</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No runs yet</TableCell></TableRow>
                )}
                {runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-mono text-xs">{run.id.slice(0, 8)}…</TableCell>
                    <TableCell className="font-mono text-xs">{run.recipientId.slice(0, 8)}…</TableCell>
                    <TableCell>{statusBadge(run.status)}</TableCell>
                    <TableCell className="font-mono text-xs">{run.currentStepId}</TableCell>
                    <TableCell className="text-xs">{run.nextResumeAt ? new Date(run.nextResumeAt).toLocaleString() : "—"}</TableCell>
                    <TableCell className="text-xs">{new Date(run.updatedAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="enroll" className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">Manually enroll a recipient by their ID.</p>
            <div className="flex gap-2">
              <Input
                placeholder="Recipient ID"
                value={enrollId}
                onChange={(e) => setEnrollId(e.target.value)}
                className="font-mono text-sm"
              />
              <Button onClick={handleEnroll} disabled={enroll.isPending || !enrollId.trim()}>Enroll</Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function JourneysPage() {
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
              <TableCell>{statusBadge(journey.status)}</TableCell>
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
