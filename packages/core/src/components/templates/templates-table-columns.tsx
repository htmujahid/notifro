import { FileTextIcon } from "lucide-react"
import { Link } from "react-router"

import { type ColumnDef } from "@notifro/ui-primitives/components/data-table"
import { DataTableColumnHeader } from "@notifro/ui-primitives/components/data-table-column-header"
import { Button } from "@notifro/ui/components/button"

import { useDeleteTemplate } from "../../queries/templates"

export type Template = {
  id: string
  name: string
  slug: string
  defaultLocale: string
  updatedAt: string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function TemplateActions({ id }: { id: string }) {
  const deleteTemplate = useDeleteTemplate()
  return (
    <div
      className="flex items-center justify-end gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      <Link
        to={`/templates/${id}`}
        className="inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted"
      >
        Edit
      </Link>
      <Button
        size="sm"
        variant="ghost"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        disabled={deleteTemplate.isPending}
        onClick={() => deleteTemplate.mutate(id)}
      >
        Delete
      </Button>
    </div>
  )
}

export function getTemplatesColumns(): ColumnDef<Template, unknown>[] {
  return [
    {
      accessorKey: "name",
      meta: { label: "Name" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <Link
          to={`/templates/${row.original.id}`}
          className="flex items-center gap-2.5 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
            <FileTextIcon className="size-3.5 text-muted-foreground" />
          </div>
          <span className="font-medium">{row.original.name}</span>
        </Link>
      ),
    },
    {
      accessorKey: "slug",
      meta: { label: "Slug" },
      enableSorting: false,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Slug" />
      ),
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {getValue() as string}
        </span>
      ),
    },
    {
      accessorKey: "defaultLocale",
      meta: { label: "Locale" },
      enableSorting: false,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Locale" />
      ),
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">{getValue() as string}</span>
      ),
    },
    {
      id: "updatedAt",
      accessorFn: (row) => formatDate(row.updatedAt),
      meta: { label: "Last modified" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Last modified" />
      ),
      enableGlobalFilter: false,
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">{getValue() as string}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      enableGlobalFilter: false,
      enableHiding: false,
      cell: ({ row }) => <TemplateActions id={row.original.id} />,
    },
  ]
}
