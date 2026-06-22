import { type Table } from "@tanstack/react-table"

import { Field, FieldLabel } from "@renderical/ui/components/field"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@renderical/ui/components/pagination"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@renderical/ui/components/select"

interface DataTablePaginationProps<TData> {
  table: Table<TData>
  pageSizeOptions?: number[]
}

export function DataTablePagination<TData>({
  table,
  pageSizeOptions = [10, 20, 50],
}: DataTablePaginationProps<TData>) {
  const { pageIndex, pageSize } = table.getState().pagination
  const serverSide = table.options.manualPagination === true
  const pageRowCount = table.getRowModel().rows.length
  const filteredCount = serverSide
    ? pageRowCount
    : table.getFilteredRowModel().rows.length

  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-xs text-muted-foreground">
        {serverSide
          ? pageRowCount === 0
            ? "No results"
            : `Page ${pageIndex + 1}`
          : filteredCount === 0
            ? "No results"
            : `${pageIndex * pageSize + 1}–${Math.min(
                (pageIndex + 1) * pageSize,
                filteredCount
              )} of ${filteredCount} row(s)`}
      </p>

      <div className="flex items-center gap-4">
        <Field orientation="horizontal" className="w-fit">
          <FieldLabel htmlFor="rows-per-page" className="text-xs">
            Rows per page
          </FieldLabel>
          <Select
            value={String(pageSize)}
            onValueChange={(v) =>
              table.setPagination({ pageIndex: 0, pageSize: Number(v) })
            }
          >
            <SelectTrigger className="w-20" id="rows-per-page" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectGroup>
                {pageSizeOptions.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => table.previousPage()}
                aria-disabled={!table.getCanPreviousPage()}
                className={
                  !table.getCanPreviousPage()
                    ? "pointer-events-none opacity-50"
                    : ""
                }
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                onClick={() => table.nextPage()}
                aria-disabled={!table.getCanNextPage()}
                className={
                  !table.getCanNextPage()
                    ? "pointer-events-none opacity-50"
                    : ""
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}
