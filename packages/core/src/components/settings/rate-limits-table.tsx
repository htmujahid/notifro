import { useMemo } from "react"

import type { RateLimitRule } from "@renderical/api-client/types"
import { DataTable } from "@renderical/ui-primitives/components/data-table"
import { useDataTable } from "@renderical/ui-primitives/components/use-data-table"

import { getRateLimitsColumns } from "./rate-limits-table-columns"

interface RateLimitsTableProps {
  data: RateLimitRule[]
  onDelete: (id: string) => void
}

export function RateLimitsTable({ data, onDelete }: RateLimitsTableProps) {
  const columns = useMemo(() => getRateLimitsColumns({ onDelete }), [onDelete])

  const { table } = useDataTable({ data, columns })

  return <DataTable table={table} />
}
