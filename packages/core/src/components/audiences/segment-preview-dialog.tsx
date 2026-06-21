import type { Segment } from "@workspace/api-client/types"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"

import { useSegmentPreview } from "../../hooks/audiences"

export function SegmentPreviewDialog({
  segment,
  onClose,
}: {
  segment: Segment
  onClose: () => void
}) {
  const { data, isLoading } = useSegmentPreview(segment.id)
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Preview: {segment.name}</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                <span className="font-semibold text-foreground">
                  {data?.count ?? 0}
                </span>{" "}
                matching recipients
              </p>
              {(data?.sample ?? []).length > 0 && (
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/40 border-b">
                        <th className="px-3 py-2 text-left text-xs text-muted-foreground font-medium">
                          ID
                        </th>
                        <th className="px-3 py-2 text-left text-xs text-muted-foreground font-medium">
                          Email
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data!.sample.map((r) => (
                        <tr key={r.id}>
                          <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                            {r.id.slice(0, 8)}…
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {r.email ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data!.count > data!.sample.length && (
                    <p className="px-3 py-2 text-xs text-muted-foreground border-t">
                      +{data!.count - data!.sample.length} more not shown
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
