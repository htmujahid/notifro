import { useMemo } from "react"

import { DataTable } from "@renderical/ui-primitives/components/data-table"
import { DataTableToolbar } from "@renderical/ui-primitives/components/data-table-toolbar"
import { useDataTable } from "@renderical/ui-primitives/components/use-data-table"

import { type Template, getTemplatesColumns } from "./templates-table-columns"

interface TemplatesTableProps {
  data: Template[]
  loading?: boolean
}

export function TemplatesTable({ data, loading }: TemplatesTableProps) {
  const columns = useMemo(() => getTemplatesColumns(), [])

  const { table } = useDataTable({ data, columns })

  return (
    <DataTable table={table} loading={loading}>
      <DataTableToolbar table={table} searchPlaceholder="Search templates…" />
    </DataTable>
  )
}
