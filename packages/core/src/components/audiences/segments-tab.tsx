import { useState } from "react"

import {
  EyeIcon,
  FilterIcon,
  PlusIcon,
  TrashIcon,
  UsersIcon,
} from "lucide-react"

import type { Segment } from "@renderical/api-client/types"
import { Button } from "@renderical/ui/components/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@renderical/ui/components/empty"

import { useDeleteSegment, useSegments } from "../../hooks/audiences"
import { NewSegmentDialog } from "./new-segment-dialog"
import { SegmentPreviewBadge } from "./segment-preview-badge"
import { SegmentPreviewDialog } from "./segment-preview-dialog"

export function SegmentsTab() {
  const { data, isLoading, fetchNextPage, hasNextPage } = useSegments()
  const deleteSegment = useDeleteSegment()
  const [showNew, setShowNew] = useState(false)
  const [preview, setPreview] = useState<Segment | null>(null)

  const rows = data?.pages.flatMap((p) => p.data) ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Reusable filters that resolve to a set of matching contacts.
        </p>
        <Button size="sm" className="gap-1.5" onClick={() => setShowNew(true)}>
          <PlusIcon className="size-4" />
          New segment
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Loading…
        </p>
      ) : rows.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FilterIcon />
            </EmptyMedia>
            <EmptyTitle>No segments yet</EmptyTitle>
            <EmptyDescription>
              Create attribute-based filters to target groups of contacts.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => setShowNew(true)}
            >
              <PlusIcon className="size-4" />
              New segment
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Recipients
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Updated
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {rows.map((seg) => (
                  <tr
                    key={seg.id}
                    className="transition-colors hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                          <UsersIcon className="size-3.5 text-muted-foreground" />
                        </div>
                        <span className="font-medium">{seg.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <SegmentPreviewBadge segmentId={seg.id} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(seg.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPreview(seg)}
                        >
                          <EyeIcon className="size-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteSegment.mutate(seg.id)}
                        >
                          <TrashIcon className="size-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasNextPage && (
            <Button
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => fetchNextPage()}
            >
              Load more
            </Button>
          )}
        </>
      )}

      <NewSegmentDialog open={showNew} onClose={() => setShowNew(false)} />
      {preview && (
        <SegmentPreviewDialog
          segment={preview}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  )
}
