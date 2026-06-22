import React from "react"

import { GitBranchIcon, PlusIcon, RouteIcon, Trash2Icon } from "lucide-react"

import { PageHeader } from "@renderical/ui-primitives/components/page-header"
import { SectionHeader } from "@renderical/ui-primitives/components/section-header"
import { Badge } from "@renderical/ui/components/badge"
import { Button } from "@renderical/ui/components/button"

import {
  useDeleteFallbackChain,
  useDeleteRoutingRule,
  useFallbackChains,
  useRoutingRules,
  useUpdateRoutingRule,
} from "../../queries/routing"
import { CreateChainDialog } from "./create-chain-dialog"
import { CreateRuleDialog } from "./create-rule-dialog"
import { RoutingRulesTable } from "./routing-rules-table"

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

  const chainName = React.useCallback(
    (chainId: string | null) => {
      if (!chainId) return null
      return chains.find((c) => c.id === chainId)?.name ?? chainId
    },
    [chains]
  )

  const handleToggle = React.useCallback(
    (id: string, enabled: boolean) => toggleRule.mutate({ id, enabled }),
    [toggleRule]
  )

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Routing"
        description="Rules decide which channel or fallback chain a notification uses. Rules are evaluated in priority order (lowest wins)."
      />

      <section className="flex flex-col gap-3">
        <SectionHeader
          title={
            <>
              <RouteIcon className="size-4" /> Routing rules
            </>
          }
        >
          <Button size="sm" onClick={() => setNewRuleOpen(true)}>
            <PlusIcon className="size-3.5 mr-1" /> New rule
          </Button>
        </SectionHeader>

        {rules.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No routing rules yet. Rules override the channel list on each send.
          </p>
        ) : (
          <RoutingRulesTable
            data={rules}
            chainName={chainName}
            onToggle={handleToggle}
            onDelete={deleteRule.mutate}
          />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeader
          title={
            <>
              <GitBranchIcon className="size-4" /> Fallback chains
            </>
          }
        >
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
