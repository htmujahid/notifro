import React from "react"

import { GitBranchIcon, PlusIcon, RouteIcon, Trash2Icon } from "lucide-react"

import { Badge } from "@renderical/ui/components/badge"
import { Button } from "@renderical/ui/components/button"
import { Switch } from "@renderical/ui/components/switch"

import {
  useDeleteFallbackChain,
  useDeleteRoutingRule,
  useFallbackChains,
  useRoutingRules,
  useUpdateRoutingRule,
} from "../../hooks/routing"
import { PageHeader } from "@renderical/ui-primitives/components/page-header"
import { SectionHeader } from "@renderical/ui-primitives/components/section-header"

import { CreateChainDialog } from "./create-chain-dialog"
import { CreateRuleDialog } from "./create-rule-dialog"

export function RoutingView() {
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
      <PageHeader
        title="Routing"
        description="Rules decide which channel or fallback chain a notification uses. Rules are evaluated in priority order (lowest wins)."
      />

      <section className="flex flex-col gap-3">
        <SectionHeader title={<><RouteIcon className="size-4" /> Routing rules</>}>
          <Button size="sm" onClick={() => setNewRuleOpen(true)}>
            <PlusIcon className="size-3.5 mr-1" /> New rule
          </Button>
        </SectionHeader>

        {rules.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No routing rules yet. Rules override the channel list on each send.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground w-16">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Match
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Target
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground w-20">
                    Enabled
                  </th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {rules.map((rule) => {
                  const match = (() => {
                    try {
                      return JSON.parse(rule.match)
                    } catch {
                      return {}
                    }
                  })() as Record<string, unknown>
                  const matchSummary =
                    Object.keys(match).length === 0
                      ? "always"
                      : Object.entries(match)
                          .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
                          .join(", ")
                  return (
                    <tr
                      key={rule.id}
                      className="transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-mono text-muted-foreground">
                        {rule.priority}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {matchSummary}
                      </td>
                      <td className="px-4 py-3">
                        {rule.targetChainId ? (
                          <span className="flex items-center gap-1">
                            <GitBranchIcon className="size-3.5 text-muted-foreground" />
                            {chainName(rule.targetChainId) ??
                              rule.targetChainId}
                          </span>
                        ) : (
                          <Badge variant="secondary">
                            {rule.targetChannel}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Switch
                          checked={rule.enabled === 1}
                          onCheckedChange={(v) =>
                            toggleRule.mutate({ id: rule.id, enabled: v })
                          }
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
        <SectionHeader title={<><GitBranchIcon className="size-4" /> Fallback chains</>}>
          <Button size="sm" onClick={() => setNewChainOpen(true)}>
            <PlusIcon className="size-3.5 mr-1" /> New chain
          </Button>
        </SectionHeader>

        {chains.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No fallback chains yet. Chains define ordered escalation steps
            across channels.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {chains.map((chain) => {
              const steps = (() => {
                try {
                  return JSON.parse(chain.steps) as Array<{
                    channel: string
                    waitForDeliveryMs: number
                    successOn: string[]
                  }>
                } catch {
                  return []
                }
              })()
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
                                {step.waitForDeliveryMs > 0
                                  ? `→ (${step.waitForDeliveryMs / 1000}s)`
                                  : "→"}
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
      <CreateRuleDialog
        open={newRuleOpen}
        onOpenChange={setNewRuleOpen}
        chains={chains}
      />
    </div>
  )
}
