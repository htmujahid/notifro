import { FileTextIcon, PlusIcon } from "lucide-react"
import { Link } from "react-router"

import {
  type ColumnDef,
  DataTable,
} from "@renderical/ui-primitives/components/data-table"
import { DataTableColumnHeader } from "@renderical/ui-primitives/components/data-table-column-header"
import { DataTableToolbar } from "@renderical/ui-primitives/components/data-table-toolbar"
import { PageHeader } from "@renderical/ui-primitives/components/page-header"
import { useDataTable } from "@renderical/ui-primitives/components/use-data-table"
import { Button } from "@renderical/ui/components/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@renderical/ui/components/empty"

import { useDeleteTemplate, useTemplates } from "../../queries/templates"

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

type Template = {
  id: string
  name: string
  slug: string
  defaultLocale: string
  updatedAt: string
}

const COLUMNS: ColumnDef<Template, unknown>[] = [
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
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Locale" />
    ),
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{getValue() as string}</span>
    ),
  },
  {
    id: "updated",
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

export function TemplatesView() {
  const { data, isLoading } = useTemplates()
  const templates = (data?.pages.flatMap((p) => p.data) ?? []) as Template[]

  const { table } = useDataTable({ data: templates, columns: COLUMNS })

  if (!isLoading && templates.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Templates"
          description="Reusable notification templates across all channels."
        >
          <Link
            to="/templates/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <PlusIcon className="size-4" />
            New template
          </Link>
        </PageHeader>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileTextIcon />
            </EmptyMedia>
            <EmptyTitle>No templates yet</EmptyTitle>
            <EmptyDescription>
              Create reusable message templates to keep your notifications
              consistent across channels.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link
              to="/templates/new"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <PlusIcon className="size-4" />
              New template
            </Link>
          </EmptyContent>
        </Empty>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Templates"
        description="Reusable notification templates across all channels."
      >
        <Link
          to="/templates/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <PlusIcon className="size-4" />
          New template
        </Link>
      </PageHeader>

      <DataTable table={table} loading={isLoading}>
        <DataTableToolbar table={table} searchPlaceholder="Search templates…" />
      </DataTable>
    </div>
  )
}
