import React from "react"

import type { FallbackChain } from "@notifro/api-client/types"
import { Button } from "@notifro/ui/components/button"
import { Input } from "@notifro/ui/components/input"
import { Label } from "@notifro/ui/components/label"
import { Switch } from "@notifro/ui/components/switch"

import { useCreateRoutingRule } from "../../queries/routing"
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "../responsive-modal"
import { CHANNELS } from "./chain-steps-editor"

export function CreateRuleDialog({
  open,
  onOpenChange,
  chains,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  chains: FallbackChain[]
}) {
  const [priority, setPriority] = React.useState("0")
  const [enabled, setEnabled] = React.useState(true)
  const [minPriority, setMinPriority] = React.useState("")
  const [targetType, setTargetType] = React.useState<"channel" | "chain">(
    "channel"
  )
  const [targetChannel, setTargetChannel] = React.useState("email")
  const [targetChainId, setTargetChainId] = React.useState("")
  const create = useCreateRoutingRule()

  function handleSubmit() {
    const match: Record<string, unknown> = {}
    if (minPriority) match.minPriority = minPriority

    const body = {
      priority: Number(priority),
      enabled,
      match,
      ...(targetType === "channel" ? { targetChannel } : { targetChainId }),
    }
    create.mutate(body, {
      onSuccess: () => {
        setPriority("0")
        setEnabled(true)
        setMinPriority("")
        setTargetType("channel")
        setTargetChannel("email")
        setTargetChainId("")
        onOpenChange(false)
      },
    })
  }

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className="max-w-md">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>New routing rule</ResponsiveModalTitle>
        </ResponsiveModalHeader>
        <ResponsiveModalBody className="flex flex-col gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Priority</Label>
              <Input
                type="number"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Enabled</Label>
              <div className="flex h-9 items-center">
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Min priority (optional)</Label>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={minPriority}
              onChange={(e) => setMinPriority(e.target.value)}
            >
              <option value="">— any —</option>
              <option value="low">low</option>
              <option value="normal">normal</option>
              <option value="high">high</option>
              <option value="urgent">urgent</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Route to</Label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={targetType === "channel" ? "default" : "outline"}
                onClick={() => setTargetType("channel")}
              >
                Channel
              </Button>
              <Button
                size="sm"
                variant={targetType === "chain" ? "default" : "outline"}
                onClick={() => setTargetType("chain")}
              >
                Chain
              </Button>
            </div>
            {targetType === "channel" ? (
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm"
                value={targetChannel}
                onChange={(e) => setTargetChannel(e.target.value)}
              >
                {CHANNELS.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            ) : (
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm"
                value={targetChainId}
                onChange={(e) => setTargetChainId(e.target.value)}
              >
                <option value="">— select chain —</option>
                {chains.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </ResponsiveModalBody>
        <ResponsiveModalFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              create.isPending || (targetType === "chain" && !targetChainId)
            }
          >
            {create.isPending ? "Creating…" : "Create rule"}
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
