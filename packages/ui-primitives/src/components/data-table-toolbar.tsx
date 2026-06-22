import * as React from "react"

import { SearchIcon, SlidersHorizontalIcon } from "lucide-react"

import { type Table } from "@tanstack/react-table"

import { Button } from "@notifro/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@notifro/ui/components/dropdown-menu"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@notifro/ui/components/input-group"

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
      <InputGroup className="max-w-xs flex-1">
        <InputGroupAddon>
          <SearchIcon className="size-3.5" />
        </InputGroupAddon>
        <InputGroupInput
          value={globalFilter}
          onChange={(e) => table.setGlobalFilter(e.target.value)}
          placeholder={searchPlaceholder}
        />
      </InputGroup>

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
