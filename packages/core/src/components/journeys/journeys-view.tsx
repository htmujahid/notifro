import React from "react"

import { PlayIcon, PlusIcon, Trash2Icon, WorkflowIcon } from "lucide-react"

import type { Journey } from "@renderical/api-client/types"
import { PageHeader } from "@renderical/ui-primitives/components/page-header"
import { SectionHeader } from "@renderical/ui-primitives/components/section-header"
import { Badge } from "@renderical/ui/components/badge"
import { Button } from "@renderical/ui/components/button"

import {
  useActivateJourney,
  useDeleteJourney,
  useJourneys,
} from "../../queries/journeys"
import { CreateJourneyDialog } from "./create-journey-dialog"

function statusBadge(status: string) {
  switch (status) {
    case "active":
      return (
        <span className="inline-flex items-center rounded-md bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
          active
        </span>
      )
    case "paused":
      return (
        <span className="inline-flex items-center rounded-md bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:text-yellow-400">
          paused
        </span>
      )
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function triggerSummary(trigger: string | null) {
  if (!trigger) return "Manual"
  try {
    const parsed = JSON.parse(trigger) as { event?: string }
    if (parsed && typeof parsed.event === "string") {
      return `Trigger: ${parsed.event}`
    }
  } catch {
    // ignore
  }
  return "Manual"
}

function stepsCount(steps: string) {
  try {
    const parsed = JSON.parse(steps)
    return Array.isArray(parsed) ? parsed.length : 0
  } catch {
    return 0
  }
}

export function JourneysView() {
  const [newJourneyOpen, setNewJourneyOpen] = React.useState(false)

  const journeysQuery = useJourneys()
  const activateJourney = useActivateJourney()
  const deleteJourney = useDeleteJourney()

  const journeys: Journey[] =
    journeysQuery.data?.pages.flatMap((p) => p.data) ?? []

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Journeys"
        description="Automated multi-step notification flows triggered by events or enrollment."
      >
        <Button size="sm" onClick={() => setNewJourneyOpen(true)}>
          <PlusIcon className="size-3.5 mr-1" /> New journey
        </Button>
      </PageHeader>

      <section className="flex flex-col gap-3">
        <SectionHeader
          title={
            <>
              <WorkflowIcon className="size-4" /> Journeys
            </>
          }
        />

        {journeys.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No journeys yet. Create one to automate multi-step sends.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {journeys.map((journey) => (
              <div key={journey.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{journey.name}</p>
                      {statusBadge(journey.status)}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{triggerSummary(journey.trigger)}</span>
                      <span>{stepsCount(journey.steps)} steps</span>
                      <span>
                        {new Date(journey.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {journey.status !== "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => activateJourney.mutate(journey.id)}
                      >
                        <PlayIcon className="size-3.5 mr-1" /> Activate
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      onClick={() => deleteJourney.mutate(journey.id)}
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <CreateJourneyDialog
        open={newJourneyOpen}
        onOpenChange={setNewJourneyOpen}
      />
    </div>
  )
}
