import { useMemo } from "react"

import { DataTable } from "@renderical/ui-primitives/components/data-table"
import { DataTableToolbar } from "@renderical/ui-primitives/components/data-table-toolbar"
import {
  type ManualTableState,
  useDataTable,
} from "@renderical/ui-primitives/components/use-data-table"

import { type Template, getTemplatesColumns } from "./templates-table-columns"

interface TemplatesTableProps {
  data: Template[]
  loading?: boolean
  hasMore: boolean
  tableState: Omit<ManualTableState, "pageCount">
}

export function TemplatesTable({
  data,
  loading,
  hasMore,
  tableState,
}: TemplatesTableProps) {
  const columns = useMemo(() => getTemplatesColumns(), [])

  const pageCount = tableState.pagination.pageIndex + (hasMore ? 2 : 1)
  const { table } = useDataTable({
    data,
    columns,
    manual: { ...tableState, pageCount },
  })

  return (
    <DataTable table={table} loading={loading}>
      <DataTableToolbar table={table} searchPlaceholder="Search templates…" />
    </DataTable>
  )
}
