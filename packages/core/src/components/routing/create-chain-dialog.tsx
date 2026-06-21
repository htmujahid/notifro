import React from "react"

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

import { useCreateFallbackChain } from "../../hooks/routing"
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New fallback chain</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={create.isPending || !name.trim() || steps.length === 0}
          >
            {create.isPending ? "Creating…" : "Create chain"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
