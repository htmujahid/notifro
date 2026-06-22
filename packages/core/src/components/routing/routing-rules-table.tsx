import { useMemo } from "react"

import type { RoutingRule } from "@notifro/api-client/types"
import { DataTable } from "@notifro/ui-primitives/components/data-table"
import {
  type ManualTableState,
  useDataTable,
} from "@notifro/ui-primitives/components/use-data-table"

import { getRoutingRulesColumns } from "./routing-rules-table-columns"

interface RoutingRulesTableProps {
  data: RoutingRule[]
  loading?: boolean
  hasMore: boolean
  tableState: Omit<ManualTableState, "pageCount">
  chainName: (chainId: string | null) => string | null
  onToggle: (id: string, enabled: boolean) => void
  onDelete: (id: string) => void
}

export function RoutingRulesTable({
  data,
  loading,
  hasMore,
  tableState,
  chainName,
  onToggle,
  onDelete,
}: RoutingRulesTableProps) {
  const columns = useMemo(
    () => getRoutingRulesColumns({ chainName, onToggle, onDelete }),
    [chainName, onToggle, onDelete]
  )

  const pageCount = tableState.pagination.pageIndex + (hasMore ? 2 : 1)
  const { table } = useDataTable({
    data,
    columns,
    manual: { ...tableState, pageCount },
  })

  return <DataTable table={table} loading={loading} />
}
