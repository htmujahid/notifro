import { useMemo } from "react"

import { DataTable } from "@notifro/ui-primitives/components/data-table"
import { useDataTable } from "@notifro/ui-primitives/components/use-data-table"

import {
  type RecentNotification,
  getRecentNotificationsColumns,
} from "./recent-notifications-table-columns"

interface RecentNotificationsTableProps {
  data: RecentNotification[]
}

export function RecentNotificationsTable({
  data,
}: RecentNotificationsTableProps) {
  const columns = useMemo(() => getRecentNotificationsColumns(), [])

  const { table } = useDataTable({ data, columns })

  return <DataTable table={table} emptyState="No notifications sent yet." />
}
