import { useMemo } from "react"

import type { AnalyticsChannelRow } from "@notifro/api-client/types"
import { DataTable } from "@notifro/ui-primitives/components/data-table"
import { useDataTable } from "@notifro/ui-primitives/components/use-data-table"

import { getAnalyticsChannelsColumns } from "./analytics-channels-table-columns"

interface AnalyticsChannelsTableProps {
  data: AnalyticsChannelRow[]
}

export function AnalyticsChannelsTable({ data }: AnalyticsChannelsTableProps) {
  const columns = useMemo(() => getAnalyticsChannelsColumns(), [])

  const { table } = useDataTable({ data, columns })

  return <DataTable table={table} emptyState="No channel data." />
}
