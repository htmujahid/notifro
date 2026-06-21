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
import { Switch } from "@workspace/ui/components/switch"
import { useCreateRoutingRule } from "../../hooks/routing"
import { CHANNELS } from "./chain-steps-editor"
import type { FallbackChain } from "@workspace/api-client/types"

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
  const [targetType, setTargetType] = React.useState<"channel" | "chain">("channel")
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New routing rule</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Priority</Label>
              <Input type="number" value={priority} onChange={(e) => setPriority(e.target.value)} />
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
              <Button size="sm" variant={targetType === "channel" ? "default" : "outline"} onClick={() => setTargetType("channel")}>Channel</Button>
              <Button size="sm" variant={targetType === "chain" ? "default" : "outline"} onClick={() => setTargetType("chain")}>Chain</Button>
            </div>
            {targetType === "channel" ? (
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm"
                value={targetChannel}
                onChange={(e) => setTargetChannel(e.target.value)}
              >
                {CHANNELS.map((ch) => <option key={ch} value={ch}>{ch}</option>)}
              </select>
            ) : (
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm"
                value={targetChainId}
                onChange={(e) => setTargetChainId(e.target.value)}
              >
                <option value="">— select chain —</option>
                {chains.map((ch) => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
              </select>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={create.isPending || (targetType === "chain" && !targetChainId)}
          >
            {create.isPending ? "Creating…" : "Create rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
