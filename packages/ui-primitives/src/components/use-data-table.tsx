import * as React from "react"

import {
  type ColumnDef,
  type OnChangeFn,
  type PaginationState,
  type SortingState,
  type Table,
  type VisibilityState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

export interface ManualTableState {
  sorting: SortingState
  onSortingChange: OnChangeFn<SortingState>
  pagination: PaginationState
  onPaginationChange: OnChangeFn<PaginationState>
  globalFilter?: string
  onGlobalFilterChange?: OnChangeFn<string>
  pageCount: number
}

interface UseDataTableProps<TData> {
  data: TData[]
  columns: ColumnDef<TData, unknown>[]
  pageSize?: number
  manual?: ManualTableState
}

interface UseDataTableReturn<TData> {
  table: Table<TData>
}

export function useDataTable<TData>({
  data,
  columns,
  pageSize: initialPageSize = 10,
  manual,
}: UseDataTableProps<TData>): UseDataTableReturn<TData> {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  })

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting: manual ? manual.sorting : sorting,
      globalFilter: manual ? (manual.globalFilter ?? "") : globalFilter,
      pagination: manual ? manual.pagination : pagination,
      columnVisibility,
    },
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange: manual ? manual.onSortingChange : setSorting,
    onPaginationChange: manual ? manual.onPaginationChange : setPagination,
    onGlobalFilterChange: manual
      ? manual.onGlobalFilterChange
      : (v: string) => {
          setGlobalFilter(v)
          setPagination((p) => ({ ...p, pageIndex: 0 }))
        },
    getCoreRowModel: getCoreRowModel(),
    ...(manual
      ? {}
      : {
          getSortedRowModel: getSortedRowModel(),
          getFilteredRowModel: getFilteredRowModel(),
          getPaginationRowModel: getPaginationRowModel(),
        }),
    manualSorting: !!manual,
    manualPagination: !!manual,
    manualFiltering: !!manual,
    enableMultiSort: !manual,
    pageCount: manual ? manual.pageCount : undefined,
    autoResetPageIndex: false,
  })

  return { table }
}
