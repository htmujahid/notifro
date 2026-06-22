import { useMemo } from "react"

import type { RoutingRule } from "@renderical/api-client/types"
import { DataTable } from "@renderical/ui-primitives/components/data-table"
import { useDataTable } from "@renderical/ui-primitives/components/use-data-table"

import { getRoutingRulesColumns } from "./routing-rules-table-columns"

interface RoutingRulesTableProps {
  data: RoutingRule[]
  chainName: (chainId: string | null) => string | null
  onToggle: (id: string, enabled: boolean) => void
  onDelete: (id: string) => void
}

export function RoutingRulesTable({
  data,
  chainName,
  onToggle,
  onDelete,
}: RoutingRulesTableProps) {
  const columns = useMemo(
    () => getRoutingRulesColumns({ chainName, onToggle, onDelete }),
    [chainName, onToggle, onDelete]
  )

  const { table } = useDataTable({ data, columns })

  return <DataTable table={table} />
}
