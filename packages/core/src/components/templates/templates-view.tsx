import { Button } from "@workspace/ui/components/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { FileTextIcon, PlusIcon } from "lucide-react"
import { Link } from "react-router"

import { useDeleteTemplate, useTemplates } from "../../hooks/templates"

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function TemplatesView() {
  const { data, isLoading } = useTemplates()
  const deleteTemplate = useDeleteTemplate()
  const templates = data?.pages.flatMap((p) => p.data) ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Templates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reusable notification templates across all channels.
          </p>
        </div>
        <Link
          to="/templates/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <PlusIcon className="size-4" />
          New template
        </Link>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : templates.length === 0 ? (
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
      ) : (
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Slug
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Locale
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Last modified
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {templates.map((t) => (
                <tr key={t.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link
                      to={`/templates/${t.id}`}
                      className="flex items-center gap-2.5 hover:underline"
                    >
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                        <FileTextIcon className="size-3.5 text-muted-foreground" />
                      </div>
                      <span className="font-medium">{t.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {t.slug}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {t.defaultLocale}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(t.updatedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/templates/${t.id}`}
                        className="inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted"
                      >
                        Edit
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={deleteTemplate.isPending}
                        onClick={() => deleteTemplate.mutate(t.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
