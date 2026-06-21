import { UnsubscribeView } from "@workspace/core/components/unsubscribe/unsubscribe-view"
import { useSearchParams } from "react-router"

export default function UnsubscribePage() {
  const [params] = useSearchParams()
  const token = params.get("token") ?? undefined
  return <UnsubscribeView token={token} />
}
