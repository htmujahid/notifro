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
import { Badge } from "@workspace/ui/components/badge"
import { PlusIcon, Trash2Icon, GitBranchIcon, RouteIcon } from "lucide-react"
import {
  useRoutingRules,
  useCreateRoutingRule,
  useUpdateRoutingRule,
  useDeleteRoutingRule,
  useFallbackChains,
  useCreateFallbackChain,
  useDeleteFallbackChain,
} from "@workspace/core/hooks/routing"
import type { FallbackChain } from "@workspace/api-client/types"

const CHANNELS = ["email", "sms", "in_app", "web_push", "mobile_push", "webhook", "slack", "discord", "teams", "telegram", "whatsapp"]
const SUCCESS_ON_OPTIONS = ["delivered", "opened", "clicked"] as const

type StepItem = { channel: string; waitForDeliveryMs: number; successOn: ('delivered' | 'opened' | 'clicked')[] }

function ChainStepsEditor({
  steps,
  onChange,
}: {
  steps: StepItem[]
  onChange: (steps: StepItem[]) => void
}) {
  function addStep() {
    onChange([...steps, { channel: "email", waitForDeliveryMs: 0, successOn: ["delivered" as const] }])
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
                    <option key={ch} value={ch}>{ch}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Wait (ms)</Label>
                <Input
                  type="number"
                  className="h-8 w-28"
                  value={step.waitForDeliveryMs}
                  onChange={(e) => updateStep(idx, { waitForDeliveryMs: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Success on</Label>
              <div className="flex gap-2">
                {SUCCESS_ON_OPTIONS.map((opt) => (
                  <label key={opt} className="flex items-center gap-1 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={step.successOn.includes(opt)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...step.successOn, opt]
                          : step.successOn.filter((s) => s !== opt)
                        updateStep(idx, { successOn: next as typeof step.successOn })
                      }}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="mt-1 h-7 w-7 shrink-0 text-muted-foreground" onClick={() => removeStep(idx)}>
            <Trash2Icon className="size-3.5" />
          </Button>
        </div>
      ))}
      {steps.length < 10 && (
        <Button variant="outline" size="sm" className="self-start" onClick={addStep}>
          <PlusIcon className="size-3.5 mr-1" /> Add step
        </Button>
      )}
    </div>
  )
}

function CreateChainDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [name, setName] = React.useState("")
  const [steps, setSteps] = React.useState<StepItem[]>([{ channel: "email", waitForDeliveryMs: 0, successOn: ["delivered"] }])
  const create = useCreateFallbackChain()

  function handleSubmit() {
    if (!name.trim() || steps.length === 0) return
    create.mutate(
      { name: name.trim(), steps },
      {
        onSuccess: () => {
          setName("")
          setSteps([{ channel: "email", waitForDeliveryMs: 0, successOn: ["delivered" as const] }])
          onOpenChange(false)
        },
      },
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
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. push → email → SMS" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Steps (in order)</Label>
            <ChainStepsEditor steps={steps} onChange={setSteps} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={create.isPending || !name.trim() || steps.length === 0}>
            {create.isPending ? "Creating…" : "Create chain"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CreateRuleDialog({
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

export default function RoutingPage() {
  const [newChainOpen, setNewChainOpen] = React.useState(false)
  const [newRuleOpen, setNewRuleOpen] = React.useState(false)

  const rulesQuery = useRoutingRules()
  const chainsQuery = useFallbackChains()
  const deleteRule = useDeleteRoutingRule()
  const deleteChain = useDeleteFallbackChain()
  const toggleRule = useUpdateRoutingRule()

  const rules = rulesQuery.data?.pages.flatMap((p) => p.data) ?? []
  const chains = chainsQuery.data?.pages.flatMap((p) => p.data) ?? []

  function chainName(chainId: string | null) {
    if (!chainId) return null
    return chains.find((c) => c.id === chainId)?.name ?? chainId
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Routing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rules decide which channel or fallback chain a notification uses. Rules are evaluated in priority order (lowest wins).
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-medium">
            <RouteIcon className="size-4" /> Routing rules
          </h2>
          <Button size="sm" onClick={() => setNewRuleOpen(true)}>
            <PlusIcon className="size-3.5 mr-1" /> New rule
          </Button>
        </div>

        {rules.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No routing rules yet. Rules override the channel list on each send.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground w-16">Priority</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Match</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Target</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground w-20">Enabled</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {rules.map((rule) => {
                  const match = (() => { try { return JSON.parse(rule.match) } catch { return {} } })() as Record<string, unknown>
                  const matchSummary = Object.keys(match).length === 0
                    ? "always"
                    : Object.entries(match).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(", ")
                  return (
                    <tr key={rule.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-muted-foreground">{rule.priority}</td>
                      <td className="px-4 py-3 text-muted-foreground">{matchSummary}</td>
                      <td className="px-4 py-3">
                        {rule.targetChainId ? (
                          <span className="flex items-center gap-1">
                            <GitBranchIcon className="size-3.5 text-muted-foreground" />
                            {chainName(rule.targetChainId) ?? rule.targetChainId}
                          </span>
                        ) : (
                          <Badge variant="secondary">{rule.targetChannel}</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Switch
                          checked={rule.enabled === 1}
                          onCheckedChange={(v) => toggleRule.mutate({ id: rule.id, enabled: v })}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground"
                          onClick={() => deleteRule.mutate(rule.id)}
                        >
                          <Trash2Icon className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-medium">
            <GitBranchIcon className="size-4" /> Fallback chains
          </h2>
          <Button size="sm" onClick={() => setNewChainOpen(true)}>
            <PlusIcon className="size-3.5 mr-1" /> New chain
          </Button>
        </div>

        {chains.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No fallback chains yet. Chains define ordered escalation steps across channels.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {chains.map((chain) => {
              const steps = (() => { try { return JSON.parse(chain.steps) as Array<{ channel: string; waitForDeliveryMs: number; successOn: string[] }> } catch { return [] } })()
              return (
                <div key={chain.id} className="rounded-xl border p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{chain.name}</p>
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        {steps.map((step, idx) => (
                          <React.Fragment key={idx}>
                            <Badge variant="outline">{step.channel}</Badge>
                            {idx < steps.length - 1 && (
                              <span className="text-xs text-muted-foreground">
                                {step.waitForDeliveryMs > 0 ? `→ (${step.waitForDeliveryMs / 1000}s)` : "→"}
                              </span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground shrink-0"
                      onClick={() => deleteChain.mutate(chain.id)}
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <CreateChainDialog open={newChainOpen} onOpenChange={setNewChainOpen} />
      <CreateRuleDialog open={newRuleOpen} onOpenChange={setNewRuleOpen} chains={chains} />
    </div>
  )
}
