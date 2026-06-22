import React from "react"

import { Button } from "@renderical/ui/components/button"
import { Input } from "@renderical/ui/components/input"
import { Label } from "@renderical/ui/components/label"

import { useCreateFallbackChain } from "../../queries/routing"
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "../responsive-modal"
import { ChainStepsEditor } from "./chain-steps-editor"
import type { StepItem } from "./chain-steps-editor"

export function CreateChainDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [name, setName] = React.useState("")
  const [steps, setSteps] = React.useState<StepItem[]>([
    { channel: "email", waitForDeliveryMs: 0, successOn: ["delivered"] },
  ])
  const create = useCreateFallbackChain()

  function handleSubmit() {
    if (!name.trim() || steps.length === 0) return
    create.mutate(
      { name: name.trim(), steps },
      {
        onSuccess: () => {
          setName("")
          setSteps([
            {
              channel: "email",
              waitForDeliveryMs: 0,
              successOn: ["delivered" as const],
            },
          ])
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className="max-w-lg">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>New fallback chain</ResponsiveModalTitle>
        </ResponsiveModalHeader>
        <ResponsiveModalBody className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. push → email → SMS"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Steps (in order)</Label>
            <ChainStepsEditor steps={steps} onChange={setSteps} />
          </div>
        </ResponsiveModalBody>
        <ResponsiveModalFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={create.isPending || !name.trim() || steps.length === 0}
          >
            {create.isPending ? "Creating…" : "Create chain"}
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
