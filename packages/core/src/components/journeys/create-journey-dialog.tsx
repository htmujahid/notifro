import React from "react"

import { Button } from "@renderical/ui/components/button"
import { Input } from "@renderical/ui/components/input"
import { Label } from "@renderical/ui/components/label"

import { type CreateJourneyInput, useCreateJourney } from "../../queries/journeys"
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "../responsive-modal"

export function CreateJourneyDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [name, setName] = React.useState("")
  const [triggerEvent, setTriggerEvent] = React.useState("")
  const [steps, setSteps] = React.useState("[]")
  const [stepsError, setStepsError] = React.useState<string | null>(null)
  const create = useCreateJourney()

  function reset() {
    setName("")
    setTriggerEvent("")
    setSteps("[]")
    setStepsError(null)
  }

  function handleSubmit() {
    let parsedSteps: CreateJourneyInput["steps"]
    try {
      parsedSteps = JSON.parse(steps) as CreateJourneyInput["steps"]
    } catch {
      setStepsError("Steps must be valid JSON.")
      return
    }
    setStepsError(null)

    const trigger = triggerEvent.trim()
      ? ({ type: "event" as const, event: triggerEvent.trim() } satisfies NonNullable<CreateJourneyInput["trigger"]>)
      : undefined

    create.mutate(
      { name, ...(trigger ? { trigger } : {}), steps: parsedSteps },
      {
        onSuccess: () => {
          reset()
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className="max-w-md">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>New journey</ResponsiveModalTitle>
        </ResponsiveModalHeader>
        <ResponsiveModalBody className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Welcome series"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Trigger event (optional)</Label>
            <Input
              value={triggerEvent}
              onChange={(e) => setTriggerEvent(e.target.value)}
              placeholder="user.signed_up"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Steps (JSON)</Label>
            <textarea
              className="min-h-32 rounded-md border bg-background px-3 py-2 font-mono text-xs"
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              spellCheck={false}
            />
            {stepsError && (
              <p className="text-xs text-destructive">{stepsError}</p>
            )}
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
            {create.isPending ? "Creating…" : "Create journey"}
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
