import * as React from "react"

import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react"

import { type Column } from "@tanstack/react-table"

interface DataTableColumnHeaderProps<
  TData,
  TValue,
> extends React.HTMLAttributes<HTMLButtonElement> {
  column: Column<TData, TValue>
  title: string
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <span className={className}>{title}</span>
  }

  const sortDir = column.getIsSorted()

  return (
    <button
      className={[
        "inline-flex cursor-pointer select-none items-center gap-1.5 hover:text-foreground",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={column.getToggleSortingHandler()}
    >
      {title}
      <span className="shrink-0 opacity-60">
        {sortDir === "asc" ? (
          <ArrowUpIcon className="size-3.5" />
        ) : sortDir === "desc" ? (
          <ArrowDownIcon className="size-3.5" />
        ) : (
          <ArrowUpDownIcon className="size-3.5" />
        )}
      </span>
    </button>
  )
}
