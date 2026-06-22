import { type ReactNode, useMemo } from "react"

import type { Delivery } from "@notifro/api-client/types"
import { DataTable } from "@notifro/ui-primitives/components/data-table"
import {
  type ManualTableState,
  useDataTable,
} from "@notifro/ui-primitives/components/use-data-table"

import { getLogsColumns } from "./logs-table-columns"

interface LogsTableProps {
  data: Delivery[]
  loading?: boolean
  hasMore: boolean
  tableState: Omit<ManualTableState, "pageCount">
  emptyState?: ReactNode
  onRetry: (id: string) => void
  retryPending: boolean
}

export function LogsTable({
  data,
  loading,
  hasMore,
  tableState,
  emptyState,
  onRetry,
  retryPending,
}: LogsTableProps) {
  const columns = useMemo(
    () => getLogsColumns({ onRetry, retryPending }),
    [onRetry, retryPending]
  )

  const pageCount = tableState.pagination.pageIndex + (hasMore ? 2 : 1)
  const { table } = useDataTable({
    data,
    columns,
    manual: { ...tableState, pageCount },
  })

  return <DataTable table={table} loading={loading} emptyState={emptyState} />
}
