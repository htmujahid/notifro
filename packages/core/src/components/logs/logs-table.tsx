import { type ReactNode, useMemo } from "react"

import type { Delivery } from "@renderical/api-client/types"
import { DataTable } from "@renderical/ui-primitives/components/data-table"
import { DataTableToolbar } from "@renderical/ui-primitives/components/data-table-toolbar"
import { useDataTable } from "@renderical/ui-primitives/components/use-data-table"

import { getLogsColumns } from "./logs-table-columns"

interface LogsTableProps {
  data: Delivery[]
  emptyState?: ReactNode
  onRetry: (id: string) => void
  retryPending: boolean
}

export function LogsTable({
  data,
  emptyState,
  onRetry,
  retryPending,
}: LogsTableProps) {
  const columns = useMemo(
    () => getLogsColumns({ onRetry, retryPending }),
    [onRetry, retryPending]
  )

  const { table } = useDataTable({ data, columns })

  return (
    <DataTable table={table} emptyState={emptyState}>
      <DataTableToolbar table={table} searchPlaceholder="Search logs…" />
    </DataTable>
  )
}
