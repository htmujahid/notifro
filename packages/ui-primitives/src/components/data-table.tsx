import * as React from "react"

import { type ColumnDef, type Table, flexRender } from "@tanstack/react-table"

import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Table as UITable,
} from "@renderical/ui/components/table"

import { DataTablePagination } from "./data-table-pagination"

export type { ColumnDef }

interface DataTableProps<TData> {
  table: Table<TData>
  children?: React.ReactNode
  loading?: boolean
  emptyState?: React.ReactNode
  onRowClick?: (row: TData) => void
  pageSizeOptions?: number[]
}

const SKELETON_ROWS = 5

export function DataTable<TData>({
  table,
  children,
  loading = false,
  emptyState,
  onRowClick,
  pageSizeOptions,
}: DataTableProps<TData>) {
  const rows = table.getRowModel().rows
  const columnCount = table.getVisibleFlatColumns().length

  return (
    <div className="flex flex-col gap-3">
      {children}

      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <UITable>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {loading ? (
              Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: columnCount }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columnCount}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyState ?? "No results found."}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={onRowClick ? "cursor-pointer" : ""}
                  onClick={
                    onRowClick ? () => onRowClick(row.original) : undefined
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </UITable>
      </div>

      {!loading && (
        <DataTablePagination table={table} pageSizeOptions={pageSizeOptions} />
      )}
    </div>
  )
}
