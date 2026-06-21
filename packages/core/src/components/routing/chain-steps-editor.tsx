import { PlusIcon, Trash2Icon } from "lucide-react"

import { Button } from "@renderical/ui/components/button"
import { Input } from "@renderical/ui/components/input"
import { Label } from "@renderical/ui/components/label"

export const CHANNELS = [
  "email",
  "sms",
  "in_app",
  "web_push",
  "mobile_push",
  "webhook",
  "slack",
  "discord",
  "teams",
  "telegram",
  "whatsapp",
]
export const SUCCESS_ON_OPTIONS = ["delivered", "opened", "clicked"] as const

export type StepItem = {
  channel: string
  waitForDeliveryMs: number
  successOn: ("delivered" | "opened" | "clicked")[]
}

export function ChainStepsEditor({
  steps,
  onChange,
}: {
  steps: StepItem[]
  onChange: (steps: StepItem[]) => void
}) {
  function addStep() {
    onChange([
      ...steps,
      {
        channel: "email",
        waitForDeliveryMs: 0,
        successOn: ["delivered" as const],
      },
    ])
  }

  function removeStep(idx: number) {
    onChange(steps.filter((_, i) => i !== idx))
  }

  function updateStep(idx: number, patch: Partial<StepItem>) {
    onChange(steps.map((s, i) => (i === idx ? { ...s, ...patch } : s)))
  }

  return (
    <div className="flex flex-col gap-3">
      {steps.map((step, idx) => (
        <div key={idx} className="flex items-start gap-2 rounded-lg border p-3">
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Channel</Label>
                <select
                  className="h-8 rounded-md border bg-background px-2 text-sm"
                  value={step.channel}
                  onChange={(e) => updateStep(idx, { channel: e.target.value })}
                >
                  {CHANNELS.map((ch) => (
                    <option key={ch} value={ch}>
                      {ch}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Wait (ms)</Label>
                <Input
                  type="number"
                  className="h-8 w-28"
                  value={step.waitForDeliveryMs}
                  onChange={(e) =>
                    updateStep(idx, {
                      waitForDeliveryMs: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Success on</Label>
              <div className="flex gap-2">
                {SUCCESS_ON_OPTIONS.map((opt) => (
                  <label
                    key={opt}
                    className="flex items-center gap-1 text-xs cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={step.successOn.includes(opt)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...step.successOn, opt]
                          : step.successOn.filter((s) => s !== opt)
                        updateStep(idx, {
                          successOn: next as typeof step.successOn,
                        })
                      }}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="mt-1 h-7 w-7 shrink-0 text-muted-foreground"
            onClick={() => removeStep(idx)}
          >
            <Trash2Icon className="size-3.5" />
          </Button>
        </div>
      ))}
      {steps.length < 10 && (
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onClick={addStep}
        >
          <PlusIcon className="size-3.5 mr-1" /> Add step
        </Button>
      )}
    </div>
  )
}
