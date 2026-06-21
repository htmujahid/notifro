import { Badge } from "@workspace/ui/components/badge"

export function JourneyStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { draft: "secondary", active: "default", paused: "outline", completed: "secondary" }
  return <Badge variant={(map[status] ?? "secondary") as "default" | "secondary" | "outline"}>{status}</Badge>
}
