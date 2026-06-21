import { useSegmentPreview } from "../../hooks/audiences"

export function SegmentPreviewBadge({ segmentId }: { segmentId: string }) {
  const { data } = useSegmentPreview(segmentId)
  if (data == null)
    return <span className="text-muted-foreground text-xs">—</span>
  return (
    <span className="font-mono text-xs text-muted-foreground">
      {data.count.toLocaleString()}
    </span>
  )
}
