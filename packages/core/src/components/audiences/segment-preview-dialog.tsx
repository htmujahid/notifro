import type { Segment } from "@renderical/api-client/types"
import { Button } from "@renderical/ui/components/button"

import { useSegmentPreview } from "../../hooks/audiences"
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "../responsive-modal"

export function SegmentPreviewDialog({
  segment,
  onClose,
}: {
  segment: Segment
  onClose: () => void
}) {
  const { data, isLoading } = useSegmentPreview(segment.id)
  return (
    <ResponsiveModal open onOpenChange={(v) => !v && onClose()}>
      <ResponsiveModalContent className="max-w-lg">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>Preview: {segment.name}</ResponsiveModalTitle>
        </ResponsiveModalHeader>
        <ResponsiveModalBody className="py-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {data?.count ?? 0}
                </span>{" "}
                matching recipients
              </p>
              {(data?.sample ?? []).length > 0 && (
                <div className="overflow-hidden rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                          ID
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
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
                    <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                      +{data!.count - data!.sample.length} more not shown
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </ResponsiveModalBody>
        <ResponsiveModalFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
