import * as React from "react"

import { SearchIcon, SlidersHorizontalIcon } from "lucide-react"

import { type Table } from "@tanstack/react-table"

import { Button } from "@renderical/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@renderical/ui/components/dropdown-menu"
import { Input } from "@renderical/ui/components/input"

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    label?: string
  }
}

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  searchPlaceholder?: string
  children?: React.ReactNode
}

export function DataTableToolbar<TData>({
  table,
  searchPlaceholder = "Search…",
  children,
}: DataTableToolbarProps<TData>) {
  const globalFilter = (table.getState().globalFilter as string) ?? ""
  const hidableColumns = table.getAllColumns().filter((col) => col.getCanHide())

  return (
    <div className="flex items-center gap-2">
      <div className="relative max-w-xs flex-1">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={globalFilter}
          onChange={(e) => table.setGlobalFilter(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-8"
        />
      </div>

      {children}

      {hidableColumns.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm" className="ml-auto gap-1.5" />
            }
          >
            <SlidersHorizontalIcon className="size-3.5" />
            View
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {hidableColumns.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize"
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
              >
                {column.columnDef.meta?.label ?? column.id}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
