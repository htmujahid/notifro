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

import { useTemplates } from "../../queries/templates"
import { TemplatesTable } from "./templates-table"
import { type Template } from "./templates-table-columns"

export function TemplatesView() {
  const { data, isLoading } = useTemplates()
  const templates = (data?.pages.flatMap((p) => p.data) ?? []) as Template[]

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

      <TemplatesTable data={templates} loading={isLoading} />
    </div>
  )
}
