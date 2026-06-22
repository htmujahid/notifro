import { useMemo } from "react"

import type { RateLimitRule } from "@notifro/api-client/types"
import { DataTable } from "@notifro/ui-primitives/components/data-table"
import {
  type ManualTableState,
  useDataTable,
} from "@notifro/ui-primitives/components/use-data-table"

import { getRateLimitsColumns } from "./rate-limits-table-columns"

interface RateLimitsTableProps {
  data: RateLimitRule[]
  loading?: boolean
  hasMore: boolean
  tableState: Omit<ManualTableState, "pageCount">
  onDelete: (id: string) => void
}

export function RateLimitsTable({
  data,
  loading,
  hasMore,
  tableState,
  onDelete,
}: RateLimitsTableProps) {
  const columns = useMemo(() => getRateLimitsColumns({ onDelete }), [onDelete])

  const pageCount = tableState.pagination.pageIndex + (hasMore ? 2 : 1)
  const { table } = useDataTable({
    data,
    columns,
    manual: { ...tableState, pageCount },
  })

  return <DataTable table={table} loading={loading} />
}
