import { RotateCcwIcon } from "lucide-react"

import type { TemplateVersion } from "@renderical/api-client/types"
import { Button } from "@renderical/ui/components/button"

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

interface VersionRowProps {
  v: TemplateVersion
  onRestore: () => void
  restoring: boolean
}

export function VersionRow({ v, onRestore, restoring }: VersionRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/40 px-4 py-3">
      <div>
        <p className="text-sm font-medium">v{v.version}</p>
        <p className="text-xs text-muted-foreground">
          {formatDate(v.createdAt)}
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        disabled={restoring}
        onClick={onRestore}
      >
        <RotateCcwIcon className="mr-1.5 size-3.5" />
        Restore
      </Button>
    </div>
  )
}
