import * as React from "react"

import type { Journey, JourneyRun } from "@workspace/api-client/types"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
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
import { Textarea } from "@workspace/ui/components/textarea"
import { toast } from "sonner"

import {
  useActivateJourney,
  useEnrollRecipient,
  useJourneyRuns,
  useUpdateJourney,
} from "../../hooks/journeys"
import { JourneyStatusBadge } from "./journey-status-badge"

const EXAMPLE_TRIGGER = JSON.stringify(
  { type: "event", event: "user.signed_up" },
  null,
  2
)

export function JourneyDetailDialog({
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

  const runs =
    runsQuery.data?.pages.flatMap((p) => (p as { data: JourneyRun[] }).data) ??
    []

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
    await update.mutateAsync({
      id: journey.id,
      steps: JSON.parse(stepsValue),
      trigger: parsedTrigger,
    })
    setEditSteps(false)
    toast.success("Journey saved")
  }

  async function handleEnroll() {
    if (!enrollId.trim()) return
    try {
      await enroll.mutateAsync({
        journeyId: journey.id,
        recipientId: enrollId.trim(),
      })
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
            {journey.name} <JourneyStatusBadge status={journey.status} />
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
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(journey.steps), null, 2)
                    } catch {
                      return journey.steps
                    }
                  })()}
                </pre>
              )}
            </div>
            <div className="flex gap-2">
              {!editSteps ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditSteps(true)}
                  disabled={journey.status === "active"}
                >
                  Edit
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={update.isPending}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditSteps(false)
                      setStepsValue(journey.steps)
                      setTriggerValue(journey.trigger ?? "")
                    }}
                  >
                    Cancel
                  </Button>
                </>
              )}
              {journey.status === "draft" || journey.status === "paused" ? (
                <Button
                  size="sm"
                  onClick={handleActivate}
                  disabled={activate.isPending}
                >
                  Activate
                </Button>
              ) : journey.status === "active" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePause}
                  disabled={update.isPending}
                >
                  Pause
                </Button>
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
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground"
                    >
                      No runs yet
                    </TableCell>
                  </TableRow>
                )}
                {runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-mono text-xs">
                      {run.id.slice(0, 8)}…
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {run.recipientId.slice(0, 8)}…
                    </TableCell>
                    <TableCell>
                      <JourneyStatusBadge status={run.status} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {run.currentStepId}
                    </TableCell>
                    <TableCell className="text-xs">
                      {run.nextResumeAt
                        ? new Date(run.nextResumeAt).toLocaleString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(run.updatedAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="enroll" className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              Manually enroll a recipient by their ID.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Recipient ID"
                value={enrollId}
                onChange={(e) => setEnrollId(e.target.value)}
                className="font-mono text-sm"
              />
              <Button
                onClick={handleEnroll}
                disabled={enroll.isPending || !enrollId.trim()}
              >
                Enroll
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
