import { FileTextIcon, PlusIcon } from "lucide-react"
import { Link } from "react-router"

import { PageHeader } from "@renderical/ui-primitives/components/page-header"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@renderical/ui/components/empty"

import { useTableQueryState } from "../../hooks/use-table-query-state"
import { useTemplates } from "../../queries/templates"
import { TemplatesTable } from "./templates-table"
import { type Template } from "./templates-table-columns"

export function TemplatesView() {
  const { listParams, tableState, filters } = useTableQueryState({
    defaultSort: "updatedAt",
    defaultOrder: "desc",
    filterKeys: ["q"],
    searchKey: "q",
  })

  const { data, isLoading } = useTemplates(listParams)
  const templates = (data?.data ?? []) as Template[]
  const hasMore = data?.nextCursor != null

  if (!isLoading && templates.length === 0 && !filters.q) {
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

      <TemplatesTable
        data={templates}
        loading={isLoading}
        hasMore={hasMore}
        tableState={tableState}
      />
    </div>
  )
}
