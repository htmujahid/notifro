import * as React from "react"

import { toast } from "sonner"

import type { Journey } from "@renderical/api-client/types"
import {
  type ColumnDef,
  DataTable,
} from "@renderical/ui-primitives/components/data-table"
import { DataTableColumnHeader } from "@renderical/ui-primitives/components/data-table-column-header"
import { DataTableToolbar } from "@renderical/ui-primitives/components/data-table-toolbar"
import { PageHeader } from "@renderical/ui-primitives/components/page-header"
import { useDataTable } from "@renderical/ui-primitives/components/use-data-table"
import { Button } from "@renderical/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@renderical/ui/components/dialog"
import { Input } from "@renderical/ui/components/input"
import { Label } from "@renderical/ui/components/label"
import { Textarea } from "@renderical/ui/components/textarea"

import {
  useCreateJourney,
  useDeleteJourney,
  useJourneys,
} from "../../hooks/journeys"
import { JourneyDetailDialog } from "./journey-detail-dialog"
import { JourneyStatusBadge } from "./journey-status-badge"

const EXAMPLE_STEPS = JSON.stringify(
  {
    step1: {
      kind: "send",
      config: {
        payload: {
          content: { title: "Welcome!", body: "Thanks for joining." },
        },
        channels: ["email"],
      },
      next: "step2",
    },
    step2: { kind: "wait", config: { delayMs: 60000 }, next: "step3" },
    step3: {
      kind: "send",
      config: {
        payload: { content: { title: "Follow up", body: "Just checking in." } },
        channels: ["email"],
      },
      next: "step4",
    },
    step4: { kind: "exit", config: {} },
  },
  null,
  2
)

const EXAMPLE_TRIGGER = JSON.stringify(
  { type: "event", event: "user.signed_up" },
  null,
  2
)

function stepCount(stepsJson: string): number {
  try {
    return Object.keys(JSON.parse(stepsJson)).length
  } catch {
    return 0
  }
}

function triggerLabel(trigger: string | null): string {
  if (!trigger) return "manual"
  try {
    const t = JSON.parse(trigger) as {
      type: string
      event?: string
      segmentId?: string
    }
    if (t.type === "event") return `event: ${t.event ?? "?"}`
    if (t.type === "segment") return `segment: ${t.segmentId ?? "?"}`
    return t.type
  } catch {
    return "unknown"
  }
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

  const journeys =
    data?.pages.flatMap((p) => (p as { data: Journey[] }).data) ?? []

  const columns = React.useMemo<ColumnDef<Journey, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        meta: { label: "Name" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Name" />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        accessorKey: "status",
        meta: { label: "Status" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => <JourneyStatusBadge status={row.original.status} />,
      },
      {
        id: "trigger",
        accessorFn: (row) => triggerLabel(row.trigger),
        meta: { label: "Trigger" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Trigger" />
        ),
        cell: ({ getValue }) => (
          <span className="text-muted-foreground">{getValue() as string}</span>
        ),
      },
      {
        id: "steps",
        accessorFn: (row) => stepCount(row.steps),
        meta: { label: "Steps" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Steps" />
        ),
        enableGlobalFilter: false,
      },
      {
        id: "created",
        accessorFn: (row) => new Date(row.createdAt).toLocaleDateString(),
        meta: { label: "Created" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Created" />
        ),
        enableGlobalFilter: false,
        cell: ({ getValue }) => (
          <span className="text-muted-foreground">{getValue() as string}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableGlobalFilter: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                try {
                  await deleteJourney.mutateAsync(row.original.id)
                  toast.success("Journey deleted")
                } catch {
                  toast.error("Cannot delete an active journey")
                }
              }}
              disabled={deleteJourney.isPending}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [deleteJourney]
  )

  const { table } = useDataTable({ data: journeys, columns })

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
    await createJourney.mutateAsync({
      name: newName.trim(),
      steps: stepsObj,
      trigger: triggerObj,
    })
    toast.success("Journey created")
    setCreateOpen(false)
    setNewName("")
    setNewSteps(EXAMPLE_STEPS)
    setNewTrigger(EXAMPLE_TRIGGER)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Journeys"
        description="Automated multi-step notification sequences."
      >
        <Button onClick={() => setCreateOpen(true)}>New Journey</Button>
      </PageHeader>

      <DataTable
        table={table}
        loading={isLoading}
        onRowClick={(journey) => setSelected(journey)}
        emptyState="No journeys yet. Create one to get started."
      >
        <DataTableToolbar table={table} searchPlaceholder="Search journeys…" />
      </DataTable>

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
              <Input
                placeholder="Welcome sequence"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
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
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createJourney.isPending || !newName.trim()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
