import { useMemo } from "react"

import type { ProviderFallback } from "@notifro/api-client/types"
import { DataTable } from "@notifro/ui-primitives/components/data-table"
import { useDataTable } from "@notifro/ui-primitives/components/use-data-table"

import { getFailoverColumns } from "./failover-table-columns"

interface FailoverTableProps {
  data: ProviderFallback[]
  onDelete: (id: string) => void
}

export function FailoverTable({ data, onDelete }: FailoverTableProps) {
  const columns = useMemo(() => getFailoverColumns({ onDelete }), [onDelete])

  const { table } = useDataTable({ data, columns })

  return <DataTable table={table} />
}
